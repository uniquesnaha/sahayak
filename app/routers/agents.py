# app/routers/agents.py

import uuid, json, re, logging
from json import JSONDecodeError
from fastapi import APIRouter, Depends, HTTPException
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types
from google.cloud import firestore
from pydantic import BaseModel
from typing import Optional

from app.agents.intent_parser import intent_agent
from app.agents.ask_sahayak import (
    ask_explanation_seq,
    ask_story_seq,
    ask_quiz_seq,
    ask_lesson_seq,
    ask_game_seq,
    ask_reflect_seq,
    ask_chat_seq,          # new
)
from app.deps import get_current_user

router = APIRouter()
db = firestore.Client()
logger = logging.getLogger("app.routers.agents")

class AskPrompt(BaseModel):
    prompt: str
    session_id: Optional[str] = None

# include chat as possible intent
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

    # if no parsed intent but history exists -> chat
    if not intent:
        if history:
            intent = "chat"
        else:
            intent = "explanation"
            slots = {"topic": req.prompt, "grades": [], "language": ""}

    # fallback topic
    if intent in ("story","quiz","lesson_plan","game") and not slots.get("topic"):
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
