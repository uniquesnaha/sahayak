# app/routers/agents.py

import os, uuid, json, re, tempfile, logging
from json import JSONDecodeError
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types
from google.cloud import firestore
from pydantic import BaseModel
from typing import Optional

from app.agents.intent_parser import intent_agent
from app.agents.ask_sahayak import (
    ask_explanation_seq, ask_story_seq, ask_quiz_seq,
    ask_lesson_seq, ask_game_seq, ask_reflect_seq, ask_chat_seq
)
from app.agents.diagram_generator import run_diagram_pipeline
from app.agents.mindmap_generator import run_mindmap_pipeline
from app.deps import get_current_user

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
