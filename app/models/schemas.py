from pydantic import BaseModel, Field
from typing import Optional, Literal

class AskRequest(BaseModel):
    # “session_id” keeps the short-term chat context
    session_id: Optional[str] = Field(
        None, description="Chat session ID (omit to start a new one)"
    )
    # which action to perform
    action: Literal["ask", "analogy", "story", "quiz"] = Field(
        "ask", description="Teacher action"
    )
    # only required for the very first Ask
    question: Optional[str] = Field(None, description="Student question")
    grade: Optional[int] = Field(None, description="Grade 1-12")
    locale: Optional[str] = Field("", description="Locale code (e.g. 'kannada')")
