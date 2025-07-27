from pydantic import BaseModel, Field
from typing import Optional, Literal, List

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

class DiagramRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for diagram generation")
    diagram_type: str = Field(
        "line-art",
        description="One of: 'line-art', 'sketch', 'full-color'"
    )
    grade: int = Field(..., description="Grade level (e.g., 5)")
    subject: str = Field(..., description="Subject context (e.g. Science)")
    regenerate: int = Field(
        1, ge=1, le=5,
        description="Number of variants to generate (1–5)"
    )


class FileLink(BaseModel):
    filename: str
    url: str

class ResourceListItem(BaseModel):
    id: str
    title: str
    type: str
    files: List[FileLink]

class ResourceOut(BaseModel):
    id: str
    title: str
    type: str

class ResourceDetail(ResourceListItem):
    payload: str 