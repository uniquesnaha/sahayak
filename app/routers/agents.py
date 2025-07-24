import json
import re
from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_current_user
from app.models.schemas import AskRequest
from app.agents.ask_sahayak import root_agent, translation_agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types

router = APIRouter()

def _strip_code_fence(s: str) -> str:
    # Remove any ```json or ``` fences
    s = re.sub(r'^\s*```(?:json)?\s*', '', s)
    s = re.sub(r'\s*```$', '', s)
    return s.strip()

@router.post("/ask-sahayak")
async def ask_sahayak(req: AskRequest, user=Depends(get_current_user)):
    # 1. Seed session
    sess = InMemorySessionService()
    session = await sess.create_session(
        app_name="ask-sahayak",
        user_id=user["uid"],
        state={
            "question": req.question,
            "grade": req.grade,
            "locale": req.locale or ""
        }
    )

    # 2. Build runner
    runner = Runner(
        agent=root_agent,
        app_name="ask-sahayak",
        session_service=sess,
    )

    # 3. Wrap user message
    user_msg = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=req.question)]
    )

    # 4. Capture the translator agent’s output
    raw = None
    async for ev in runner.run_async(
        user_id=user["uid"],
        session_id=session.id,
        new_message=user_msg,
    ):
        if getattr(ev, "author", "") == translation_agent.name:
            raw = "".join(p.text for p in ev.content.parts).strip()

    if not raw:
        raise HTTPException(500, "Translation agent did not emit JSON")

    # 5. Clean & parse JSON
    clean = _strip_code_fence(raw)
    try:
        return json.loads(clean)
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Invalid JSON: {e}")

