from pydantic import BaseModel, Field

class AskRequest(BaseModel):
    question: str = Field(..., description="Student's question")
    grade: int = Field(..., description="Student grade (e.g., 5)")
    locale: str | None = Field(None, description="Locale (e.g., 'Tamil Nadu')")
