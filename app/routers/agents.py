# app/routers/agents.py

import json
import re
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from google.cloud import firestore, vision
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types

from app.deps import get_current_user
from app.models.schemas import AskRequest
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


def _strip(s: str) -> str:
    """Remove leading/trailing ```json fences."""
    s = re.sub(r'^\s*```(?:json)?\s*', '', s)
    return re.sub(r'\s*```$', '', s).strip()


AGENT_MAP = {
    "ask": answer_agent,
    "analogy": analogy_agent,
    "story": story_agent,
    "quiz": quiz_agent,
}


@router.post("/ask-sahayak")
async def ask_sahayak(req: AskRequest, user=Depends(get_current_user)):
    # … your existing ask-sahayak handler unchanged …
    ...


@router.post("/worksheet-builder")
async def build_worksheets(
    grade: int = Form(..., description="Grade level"),
    locale: str = Form("", description="Locale (e.g. 'kannada')"),
    files: list[UploadFile] = File(..., description="Page images"),
    user=Depends(get_current_user),
):
    logger.debug("▶ /worksheet-builder: grade=%s locale=%r files=%d",
                 grade, locale, len(files))

    # 1️⃣ OCR via Vision API
    vision_client = vision.ImageAnnotatorClient()
    pages = []
    for file in files:
        content = await file.read()
        resp = vision_client.text_detection(image=vision.Image(content=content))
        if resp.error.message:
            logger.error("Vision OCR error: %s", resp.error.message)
            raise HTTPException(500, f"OCR failed: {resp.error.message}")
        text = resp.full_text_annotation.text or ""
        logger.debug("OCR'd page %s:\n%s", file.filename, text[:200].replace("\n", " "))
        pages.append(text)

    # 2️⃣ Seed ADK session
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

    # **Pass the actual OCR text as the user message** so Gemini has it front-and-center
    joined = "\n\n--- Page Break ---\n\n".join(pages)
    prompt = f"Here are the textbook pages:\n\n{joined}\n\nGenerate the worksheets now."
    user_msg = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=prompt)]
    )

    # 3️⃣ Run the agent
    raw = None
    async for ev in runner.run_async(
        user_id=user["uid"],
        session_id=session.id,
        new_message=user_msg
    ):
        if ev.author == worksheet_agent.name and getattr(ev, "content", None):
            raw = "".join(p.text for p in ev.content.parts).strip()
            logger.debug("   Raw worksheet output (first 200 chars): %s", raw[:200])

    if not raw:
        logger.error("No output from worksheet_agent")
        raise HTTPException(500, "Worksheet generation failed")

    # 4️⃣ Parse JSON
    clean = _strip(raw)
    try:
        output = json.loads(clean)
    except json.JSONDecodeError as e:
        logger.exception("JSON parse error: %s", clean[:200])
        raise HTTPException(500, f"Invalid JSON from agent: {e}")

    # 5️⃣ Store in Firestore
    wb_ref = db.collection("worksheets").document()
    wb_ref.set({
        "user_id": user["uid"],
        "created_at": firestore.SERVER_TIMESTAMP,
        "grade": grade,
        "locale": locale,
        "worksheets": output["worksheets"],
    })
    worksheet_id = wb_ref.id
    logger.debug("Stored worksheets in Firestore with ID %s", worksheet_id)

    # 6️⃣ Return
    return {"worksheet_id": worksheet_id, "worksheets": output["worksheets"]}
