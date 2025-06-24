from typing import Optional

from pydantic import BaseModel, Field


class InternshipDraft(BaseModel):
    """
    Lightweight schema used by the employer agent to *validate* JSON
    describing a NEW internship before it’s pushed into the “Create New”
    tab.  All fields are optional so the model can send partial drafts.
    """

    title: Optional[str] = Field(None, max_length=120)
    description: Optional[str] = None
    location: Optional[str] = None  # City, Country OR “Remote”
    requirements: Optional[str] = None
    remote: Optional[bool] = None  # true ⇢ remote-friendly

    class Config:
        extra = "forbid"  # reject unknown keys to keep payloads clean
