# app/routers/agents.py

import json
import re
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from google.cloud import firestore
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
    logger.debug("▶ Received /ask-sahayak: %s", req.json())
    # 1) Determine session ID
    sid = req.session_id or str(uuid.uuid4())
    logger.debug("   Using session_id=%s", sid)

    # 2) Firestore refs
    chat_ref = db.collection("chat_sessions").document(sid)
    msgs_col = chat_ref.collection("messages")

    # 3) On initial ask, record the user question + context
    if req.action == "ask":
        if not req.question or req.grade is None:
            logger.warning("Bad ask request: missing question or grade")
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
        logger.debug("   Stored user question and context")

    # 4) Load last 5 turns + context doc
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
    logger.debug("   Loaded history (%d) + context=%s", len(history), ctx)

    # 5) Pick the correct agent
    agent = AGENT_MAP.get(req.action)
    if not agent:
        logger.error("Unknown action: %s", req.action)
        raise HTTPException(400, f"Unknown action: {req.action}")
    logger.debug("   Using agent: %s", agent.name)

    # 6) Seed session state
    state = {"history": history, **ctx}
    if req.action == "ask":
        state["question"] = req.question
    logger.debug("   Session state: %s", state)

    sess_svc = InMemorySessionService()
    session = await sess_svc.create_session(
        app_name="ask-sahayak",
        user_id=user["uid"],
        state=state,
    )

    # 7) Run the agent
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
        logger.debug("   Event from %s: %s", ev.author, ev)
        if ev.author == agent.name and getattr(ev, "content", None):
            texts = [p.text for p in ev.content.parts]
            raw_output = "".join(texts).strip()
            logger.debug("   Raw output: %s", raw_output)

    if not raw_output:
        logger.error("No response from agent %s", agent.name)
        raise HTTPException(500, "Agent produced no output")

    # 8) Strip fences + parse JSON with fallback
    payload = {}
    clean = _strip(raw_output)
    try:
        payload = json.loads(clean)
    except json.JSONDecodeError:
        logger.warning(
            "Malformed JSON from %s, falling back to plain text: %s",
            agent.name, clean
        )
        # Fallback for non-JSON (e.g. small talk)
        if req.action == "ask":
            payload = {
                "answer_en": clean,
                "answer_local": ""
            }
        else:
            # Non-ask actions should at least return their keys
            if req.action == "analogy":
                payload = {"analogy_en": clean, "analogy_local": ""}
            elif req.action == "story":
                payload = {"story_en": clean, "story_local": ""}
            elif req.action == "quiz":
                payload = {"quiz_en": [], "quiz_local": []}

    # 9) Persist the “ask” result for future follow-ups
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
        logger.debug("   Saved bot answer to context")

    # 10) Return everything + session_id so the UI can continue
    resp = {"session_id": sid, **payload}
    logger.debug("◀ Responding: %s", resp)
    return resp
