# app/routers/agents.py
import io
import os, uuid, json, re, tempfile, logging
from json import JSONDecodeError
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types
from fastapi import APIRouter, Depends, File, UploadFile, Form
from google.cloud import firestore
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import StreamingResponse
from google.cloud import vision
from app.agents.intent_parser import intent_agent
from app.agents.ask_sahayak import (
    ask_explanation_seq, ask_story_seq, ask_quiz_seq,
    ask_lesson_seq, ask_game_seq, ask_reflect_seq, ask_chat_seq
)
from app.agents.diagram_generator import run_diagram_pipeline
from app.agents.mindmap_generator import run_mindmap_pipeline
from app.agents.worksheet_builder import run_worksheet_pipeline
from app.deps import get_current_user
from typing import List
from app.deps import get_db, get_bucket
from google.cloud import storage as gcs

router = APIRouter()
db = firestore.Client()
logger = logging.getLogger("app.routers.agents")

# ─────────────────────── ASK SAHAYAK ───────────────────────

class AskPrompt(BaseModel):
    prompt: str
    session_id: Optional[str] = None

AGENT_SEQS = {
    "explanation":  ask_explanation_seq,
    "story":        ask_story_seq,
    "quiz":         ask_quiz_seq,
    "lesson_plan":  ask_lesson_seq,
    "game":         ask_game_seq,
    "reflect":      ask_reflect_seq,
    "chat":         ask_chat_seq,
}

@router.post("/ask-sahayak")
async def ask_sahayak(req: AskPrompt, user=Depends(get_current_user)):
    sid  = req.session_id or str(uuid.uuid4())
    chat = db.collection("chat_sessions").document(sid)
    msgs = chat.collection("messages")
    msgs.add({"sender":"user","text":req.prompt,"ts":firestore.SERVER_TIMESTAMP})
    chat.set({"last_updated":firestore.SERVER_TIMESTAMP}, merge=True)

    docs    = msgs.order_by("ts", direction=firestore.Query.DESCENDING).limit(10).stream()
    history = [{"sender":d.get("sender"),"text":d.get("text")} for d in reversed(list(docs))]
    logger.debug("🔍 Loaded history for %s: %s", sid, history)

    sess1    = InMemorySessionService()
    session1 = await sess1.create_session(app_name="ask-sahayak", user_id=user["uid"], state={"history":history})
    runner1  = Runner(agent=intent_agent, app_name="ask-sahayak", session_service=sess1)
    new_msg  = genai_types.Content(role="user", parts=[genai_types.Part(text=req.prompt)])

    intent_out = None
    async for ev in runner1.run_async(user_id=user["uid"], session_id=session1.id, new_message=new_msg):
        if ev.author == intent_agent.name and ev.content:
            intent_out = "".join(p.text for p in ev.content.parts).strip()

    logger.debug("🔍 Raw intent output: %r", intent_out or "")
    cleaned = re.sub(r"^```(?:json)?\s*", "", intent_out or "")
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    logger.debug("🔍 Cleaned intent JSON: %r", cleaned)

    try:
        parsed = json.loads(cleaned) if cleaned else {}
    except JSONDecodeError:
        parsed = {}

    intent = parsed.get("intent")
    slots  = parsed.get("slots", {})

    if not intent:
        intent = "chat" if history else "explanation"
        if not history:
            slots = {"topic": req.prompt, "grades": [], "language": ""}

    if intent in ("story", "quiz", "lesson_plan", "game") and not slots.get("topic"):
        slots["topic"] = req.prompt
    if intent == "reflect":
        slots["reflection"] = req.prompt

    seq = AGENT_SEQS.get(intent)
    if not seq:
        raise HTTPException(400, f"Unknown intent: {intent}")

    state    = {"history": history, **slots}
    sess2    = InMemorySessionService()
    session2 = await sess2.create_session(app_name="ask-sahayak", user_id=user["uid"], state=state)
    runner2  = Runner(agent=seq, app_name="ask-sahayak", session_service=sess2)

    reply = ""
    async for ev in runner2.run_async(user_id=user["uid"], session_id=session2.id, new_message=new_msg):
        if ev.content:
            chunk = "".join(p.text or "" for p in ev.content.parts)
            reply += chunk
            logger.debug("🔸 chunk from %s: %r", ev.author, chunk)

    reply = reply.strip()
    logger.debug("✅ final reply: %r", reply)

    msgs.add({"sender":"bot","text":reply,"ts":firestore.SERVER_TIMESTAMP})
    return {"session_id": sid, "response": reply}


# ─────────────────────── DIAGRAM GENERATOR (Image) ───────────────────────

class DiagramRequest(BaseModel):
    prompt: str
    diagram_type: str
    grade: int

@router.post("/diagram-generator")
async def generate_diagram(req: DiagramRequest, user=Depends(get_current_user)):
    img_bytes = run_diagram_pipeline(
        prompt=req.prompt,
        diagram_type=req.diagram_type,
        grade=req.grade
    )
    tmp_dir = tempfile.gettempdir()
    filename = f"{req.diagram_type}_{uuid.uuid4().hex}.png"
    tmp_path = os.path.join(tmp_dir, filename)
    with open(tmp_path, "wb") as f:
        f.write(img_bytes)

    return FileResponse(
        path=tmp_path,
        media_type="image/png",
        filename=filename
    )


# ─────────────────────── MIND MAP GENERATOR (PlantUML Code) ───────────────────────

class MindmapRequest(BaseModel):
    text: str
    grade: int
    subject: str


@router.post("/mindmap-generator")
async def generate_mindmap(req: MindmapRequest, user=Depends(get_current_user)):
    """
    Returns cleaned PlantUML code as a JSON response.
    JSON will escape newlines (\n) but the code is valid and will render fine.
    """
    result = run_mindmap_pipeline(
        text=req.text,
        grade=req.grade,
        subject=req.subject
    )
    return { "code": result["code"] }  # stays JSON with valid PlantUML inside
#-------------------------------------------------------------------------------
# inline Vision OCR
_vision = vision.ImageAnnotatorClient()
def ocr_image_to_text(b: bytes) -> str:
    img = vision.Image(content=b)
    res = _vision.text_detection(image=img)
    if res.error.message:
        raise RuntimeError(res.error.message)
    return (res.full_text_annotation.text or "").strip()

@router.post("/worksheets/json")
async def worksheets_json(
    grade: int = Form(...),
    subject: str = Form(...),
    num_questions: int = Form(5),
    files: List[UploadFile] = File(...),
    user = Depends(get_current_user)
):
    # 1) OCR
    pages = []
    for f in files:
        b = await f.read()
        pages.append(ocr_image_to_text(b))

    # 2) Gemini → JSON
    result = run_worksheet_pipeline(
        pages=pages,
        grade=grade,
        subject=subject,
        num_questions=num_questions
    )
    # result is already a dict: { "worksheets": [ {level,questions,answers}, … ] }
    return JSONResponse(result)

    #----------------------------------------------------------------------
    
@router.post("/resources")
async def publish_resource(
    title: str = Form(...),
    type: str = Form(...),                  # "worksheet" or "diagram"
    payload: str = Form(...),               # JSON string describing the resource
    files: List[UploadFile] = File(...),    # PDFs or images
    db: firestore.Client = Depends(get_db),
    bucket: gcs.Bucket = Depends(get_bucket),
    user=Depends(get_current_user),
):
    """
    1) Generate a new resource ID
    2) Upload each file to Cloud Storage under `<resource_id>/<filename>`
    3) Write a Firestore document with metadata + payload + file list
    """
    # 1) New ID and timestamp
    resource_id = str(uuid.uuid4())
    now = firestore.SERVER_TIMESTAMP

    # 2) Upload files & collect metadata
    file_entries = []
    for f in files:
        path = f"{resource_id}/{f.filename}"
        blob = bucket.blob(path)
        content = await f.read()
        blob.upload_from_string(content)
        file_entries.append({"filename": f.filename, "path": path})

    # 3) Persist to Firestore
    doc_ref = db.collection("resources").document(resource_id)
    doc_ref.set({
        "title": title,
        "type": type,
        "payload": payload,
        "files": file_entries,
        "created_by": user["uid"],
        "created_at": now,
    })

    return {"id": resource_id, "title": title, "type": type}


@router.get("/resources")
async def list_resources(
    db: firestore.Client = Depends(get_db),
    bucket: gcs.Bucket = Depends(get_bucket),
):
    """
    Lists all resources. Returns:
    [
      {
        id: "...",
        title: "...",
        type: "...",
        files: [ { filename, url }, ... ]
      },
      ...
    ]
    """
    docs = db.collection("resources").stream()
    out = []

    for doc in docs:
        data = doc.to_dict()
        signed = []
        for f in data.get("files", []):
            url = bucket.blob(f["path"]).generate_signed_url(expiration=3600)
            signed.append({"filename": f["filename"], "url": url})

        out.append({
            "id": doc.id,
            "title": data.get("title"),
            "type": data.get("type"),
            "files": signed,
        })

    return JSONResponse(out)


@router.get("/resources/{resource_id}")
async def get_resource(
    resource_id: str,
    db: firestore.Client = Depends(get_db),
    bucket: gcs.Bucket = Depends(get_bucket),
):
    """
    Fetches a single resource by ID, including its payload and signed file URLs.
    """
    doc = db.collection("resources").document(resource_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Resource not found")

    data = doc.to_dict()
    signed = []
    for f in data.get("files", []):
        url = bucket.blob(f["path"]).generate_signed_url(expiration=3600)
        signed.append({"filename": f["filename"], "url": url})

    return JSONResponse({
        "id": resource_id,
        "title": data.get("title"),
        "type": data.get("type"),
        "payload": data.get("payload"),
        "files": signed,
    })
