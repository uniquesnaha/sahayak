# app/routers/agents.py

import json
import os
import os
import re
import uuid
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from google.adk.sessions import InMemorySessionService
from google import genai
from google.adk.runners import Runner
from google.cloud import firestore, vision, storage
from google.genai import types as genai_types
from pydantic import BaseModel, Field

from app.deps import get_current_user
from app.agents.ask_sahayak import (
    answer_agent,
    analogy_agent,
    story_agent,
    quiz_agent,
)
from app.agents.worksheet_builder import worksheet_agent

router = APIRouter()
db = firestore.Client()
logger = logging.getLogger("app.routers.agents")

db = firestore.Client()  # GCP Firestore for metadata + Resource Bazaar
gcs = storage.Client()
bucket = gcs.bucket(os.environ["GCS_BUCKET_NAME"])  # your GCS bucket

# Google GenAI SDK client, configured to hit Vertex AI
genai_client = genai.Client(
    vertexai=True,
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    location=os.environ["GOOGLE_CLOUD_LOCATION"],
)
vision_client = vision.ImageAnnotatorClient()
def _strip(s: str) -> str:
    """Remove leading/trailing ```json fences."""
    s = re.sub(r'^\s*```(?:json)?\s*', '', s)
    return re.sub(r'\s*```$', '', s).strip()


# ──────────────────────────────────────────────────────────────────────────────
# Schemas for Ask Sahayak
class AskRequest(BaseModel):
    question: str
    grade: int
    locale: Optional[str]
    action: str
    session_id: Optional[str]


# ──────────────────────────────────────────────────────────────────────────────
# Schemas for Resource Bazaar
class ResourcePublishRequest(BaseModel):
    type: str = Field(..., description="Resource type, e.g. 'worksheet'")
    source_id: str = Field(..., description="ID in the original collection")
    title: str = Field(..., description="Descriptive title")
    description: Optional[str] = Field("", description="Longer description")
    tags: List[str] = Field(default_factory=list, description="Array of tags")


class ResourceUpdateRequest(BaseModel):
    title: Optional[str]
    description: Optional[str]
    tags: Optional[List[str]]


class RateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="1–5 star rating")


# ──────────────────────────────────────────────────────────────────────────────
AGENT_MAP = {
    "ask": answer_agent,
    "analogy": analogy_agent,
    "story": story_agent,
    "quiz": quiz_agent,
}


@router.post("/ask-sahayak")
async def ask_sahayak(req: AskRequest, user=Depends(get_current_user)):
    logger.debug("▶ Received /ask-sahayak: %s", req.json())
    sid = req.session_id or str(uuid.uuid4())
    logger.debug("   Using session_id=%s", sid)

    chat_ref = db.collection("chat_sessions").document(sid)
    msgs_col = chat_ref.collection("messages")

    if req.action == "ask":
        if not req.question or req.grade is None:
            raise HTTPException(400, "question & grade required for action='ask'")
        msgs_col.add({
            "sender": "user",
            "text": req.question,
            "ts": firestore.SERVER_TIMESTAMP
        })
        chat_ref.set({
            "grade": req.grade,
            "locale": req.locale or ""
        }, merge=True)

    ctx = chat_ref.get().to_dict() or {}
    history_docs = (
        msgs_col
        .order_by("ts", direction=firestore.Query.DESCENDING)
        .limit(5)
        .stream()
    )
    history = [
        {"sender": d.get("sender"), "text": d.get("text")}
        for d in reversed(list(history_docs))
    ]

    agent = AGENT_MAP.get(req.action)
    if not agent:
        raise HTTPException(400, f"Unknown action: {req.action}")

    state = {"history": history, **ctx}
    if req.action == "ask":
        state["question"] = req.question

    sess_svc = InMemorySessionService()
    session = await sess_svc.create_session(
        app_name="ask-sahayak",
        user_id=user["uid"],
        state=state,
    )

    runner = Runner(
        agent=agent,
        app_name="ask-sahayak",
        session_service=sess_svc
    )

    new_msg = None
    if req.action == "ask":
        new_msg = genai_types.Content(
            role="user",
            parts=[genai_types.Part(text=req.question)]
        )

    raw_output = None
    async for ev in runner.run_async(
        user_id=user["uid"],
        session_id=session.id,
        new_message=new_msg
    ):
        if ev.author == agent.name and getattr(ev, "content", None):
            raw_output = "".join(p.text for p in ev.content.parts).strip()

    if not raw_output:
        raise HTTPException(500, "Agent produced no output")

    clean = _strip(raw_output)
    try:
        payload = json.loads(clean)
    except json.JSONDecodeError:
        # fallback
        if req.action == "ask":
            payload = {"answer_en": clean, "answer_local": ""}
        elif req.action == "analogy":
            payload = {"analogy_en": clean, "analogy_local": ""}
        elif req.action == "story":
            payload = {"story_en": clean, "story_local": ""}
        else:
            payload = {"quiz_en": [], "quiz_local": []}

    if req.action == "ask":
        chat_ref.set({
            "answer_en": payload.get("answer_en", ""),
            "answer_local": payload.get("answer_local", "")
        }, merge=True)
        msgs_col.add({
            "sender": "bot",
            "text": payload.get("answer_en", ""),
            "ts": firestore.SERVER_TIMESTAMP
        })

    return {"session_id": sid, **payload}


# ──────────────────────────────────────────────────────────────────────────────
@router.post("/worksheet-builder")
async def build_worksheets(
    grade: int = Form(..., description="Grade level"),
    locale: str = Form("", description="Locale (e.g. 'kannada')"),
    files: list[UploadFile] = File(..., description="Page images"),
    user=Depends(get_current_user),
):
    logger.debug("▶ /worksheet-builder: grade=%s locale=%r files=%d",
                 grade, locale, len(files))

    vision_client = vision.ImageAnnotatorClient()
    pages = []
    for file in files:
        content = await file.read()
        resp = vision_client.text_detection(image=vision.Image(content=content))
        if resp.error.message:
            raise HTTPException(500, f"OCR failed: {resp.error.message}")
        text = resp.full_text_annotation.text or ""
        pages.append(text)

    state = {"pages": pages, "grade": grade, "locale": locale}
    sess_svc = InMemorySessionService()
    session = await sess_svc.create_session(
        app_name="worksheet-builder",
        user_id=user["uid"],
        state=state,
    )

    runner = Runner(
        agent=worksheet_agent,
        app_name="worksheet-builder",
        session_service=sess_svc
    )

    joined = "\n\n--- Page Break ---\n\n".join(pages)
    prompt = f"Here are the textbook pages:\n\n{joined}\n\nGenerate the worksheets now."
    user_msg = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=prompt)]
    )

    raw = None
    async for ev in runner.run_async(
        user_id=user["uid"],
        session_id=session.id,
        new_message=user_msg
    ):
        if ev.author == worksheet_agent.name and getattr(ev, "content", None):
            raw = "".join(p.text for p in ev.content.parts).strip()

    if not raw:
        raise HTTPException(500, "Worksheet generation failed")

    clean = _strip(raw)
    try:
        output = json.loads(clean)
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Invalid JSON from agent: {e}")

    wb_ref = db.collection("worksheets").document()
    wb_ref.set({
        "user_id": user["uid"],
        "created_at": firestore.SERVER_TIMESTAMP,
        "grade": grade,
        "locale": locale,
        "worksheets": output["worksheets"],
    })
    worksheet_id = wb_ref.id

    return {"worksheet_id": worksheet_id, "worksheets": output["worksheets"]}


# ──────────────────────────────────────────────────────────────────────────────
@router.get("/resources")
async def list_resources():
    docs = db.collection("resources").stream()
    out = []
    for doc in docs:
        d = doc.to_dict()
        out.append({
            "id": doc.id,
            "type": d.get("type"),
            "source_id": d.get("source_id"),
            "title": d.get("title"),
            "description": d.get("description"),
            "tags": d.get("tags", []),
            "author_id": d.get("author_id"),
            "created_at": d.get("created_at"),
            "avg_rating": d.get("avg_rating", 0)
        })
    return out


@router.post("/resources")
async def publish_resource(req: ResourcePublishRequest, user=Depends(get_current_user)):
    data = req.dict()
    data.update({
        "author_id": user["uid"],
        "created_at": firestore.SERVER_TIMESTAMP,
        "ratings": {},
        "avg_rating": 0
    })
    ref = db.collection("resources").document()
    ref.set(data)
    return {"id": ref.id}


@router.put("/resources/{rid}")
async def update_resource(rid: str, req: ResourceUpdateRequest, user=Depends(get_current_user)):
    ref = db.collection("resources").document(rid)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(404, "Resource not found")
    d = snap.to_dict()
    if d.get("author_id") != user["uid"]:
        raise HTTPException(403, "Only author may update")
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if updates:
        ref.update(updates)
    return {"updated": True}


@router.post("/resources/{rid}/rate")
async def rate_resource(rid: str, req: RateRequest, user=Depends(get_current_user)):
    ref = db.collection("resources").document(rid)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(404, "Resource not found")
    d = snap.to_dict()
    ratings = d.get("ratings", {})
    ratings[user["uid"]] = req.rating
    avg = sum(ratings.values()) / len(ratings)
    ref.update({
        "ratings": ratings,
        "avg_rating": avg
    })
    return {"avg_rating": avg}

#----------------------------------------------------------------------------------------
#Diagram Generator
class DiagramRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for diagram")
    diagram_type: str = Field("line-art", description="line-art | sketch | full-color")
    grade: int = Field(..., description="Grade level (e.g. 5)")
    subject: str = Field(..., description="Subject (e.g. Science)")
    regenerate: int = Field(1, ge=1, le=5, description="How many variants to generate")


@router.post("/diagram-generator")
async def generate_diagram(req: DiagramRequest, user=Depends(get_current_user)):
    """
    Generate 1‒5 diagram variants, auto-label, caption/translate, upload to GCS,
    record metadata in Firestore, and publish to Resource Bazaar.
    """
    # 1️⃣  Enrich the prompt for the image model
    enriched = (
        f"As a Grade {req.grade} {req.subject} teacher, draw a "
        f"{req.diagram_type} diagram of: {req.prompt}"
    )

    # 2️⃣  Generate images via Google GenAI SDK (Imagen 3)
    resp = genai_client.models.generate_images(
        model="imagen-3.0-generate-002",
        prompt=enriched,
        config=genai_types.GenerateImagesConfig(
            number_of_images=req.regenerate
        ),
    )

    images_info: list[dict] = []
    for gen in resp.generated_images:
        img_bytes = gen.image.image_bytes          # raw PNG bytes
        img_id = str(uuid.uuid4())
        blob = bucket.blob(f"diagrams/{img_id}.png")
        blob.upload_from_string(img_bytes, content_type="image/png")
        images_info.append({"img_id": img_id, "url": blob.public_url})

    # 3️⃣  Auto-label each image with Vision
    for info in images_info:
        content = bucket.blob(f"diagrams/{info['img_id']}.png").download_as_bytes()
        vresp = vision_client.label_detection(image=vision.Image(content=content))
        info["labels"] = [l.description for l in vresp.label_annotations][:10]

    # 4️⃣  English caption + local translation via GenAI
    cap_en = genai_client.models.generate_text(
        model="chat-bison@001",
        prompt=f"Provide a concise caption (max 30 words) for: {req.prompt}"
    ).text.strip()

    cap_loc = genai_client.models.generate_text(
        model="chat-bison@001",
        prompt=f"Translate this into the local language: {cap_en}"
    ).text.strip()

    # 5️⃣  Store metadata in Firestore (diagrams/{id})
    diag_ref = db.collection("diagrams").document()
    diagram_id = diag_ref.id
    diag_ref.set({
        "user_id": user["uid"],
        "created_at": firestore.SERVER_TIMESTAMP,
        "prompt": req.prompt,
        "diagram_type": req.diagram_type,
        "grade": req.grade,
        "subject": req.subject,
        "images": images_info,
        "caption_en": cap_en,
        "caption_local": cap_loc,
    })

    # 6️⃣  Auto-publish to Resource Bazaar
    res_ref = db.collection("resources").document()
    res_ref.set({
        "type": "diagram",
        "source_id": diagram_id,
        "title": f"{req.diagram_type.title()} Diagram: {req.prompt}",
        "description": cap_en,
        "tags": [req.subject.lower(), f"grade{req.grade}", req.diagram_type],
        "author_id": user["uid"],
        "created_at": firestore.SERVER_TIMESTAMP,
        "ratings": {},
        "avg_rating": 0,
    })

    # 7️⃣  Return payload to UI
    return {
        "diagram_id": diagram_id,
        "images": images_info,
        "caption_en": cap_en,
        "caption_local": cap_loc,
    }
