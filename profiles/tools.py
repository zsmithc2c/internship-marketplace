"""
OpenAI-Agents tool: create or update an intern’s profile.

The Pipeline Profile-Builder agent will call **set_profile_fields_v1**
exactly once—after it has gathered every required profile field from the user.
"""

from __future__ import annotations

import datetime as _dt
from typing import List, Literal, Optional

from agents import function_tool as tool  # decorator that auto-generates the schema
from django.contrib.auth import get_user_model
from django.db import transaction
from pydantic import BaseModel, Field, ValidationError, validator

from .models import Profile
from .serializers import ProfileSerializer

User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────────
# 🗄️  Pydantic payload schemas
# ──────────────────────────────────────────────────────────────────────────────
class AvailabilityPayload(BaseModel):
    status: Literal["IMMEDIATELY", "FROM_DATE", "UNAVAILABLE"]
    earliest_start: Optional[_dt.date] = Field(
        None, description="YYYY-MM-DD – required when status == FROM_DATE"
    )
    hours_per_week: Optional[int] = Field(None, ge=1, le=99)
    remote_ok: bool = True
    onsite_ok: bool = False

    # enforce earliest_start when needed
    @validator("earliest_start", always=True)
    def _check_start(cls, v, values):  # noqa: N805
        if values.get("status") == "FROM_DATE" and v is None:
            raise ValueError("earliest_start required when status == FROM_DATE")
        return v


class EducationPayload(BaseModel):
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: _dt.date
    end_date: Optional[_dt.date] = None
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    description: Optional[str] = None


class ProfilePayload(BaseModel):
    # 1 ─ Basics
    headline: str
    bio: str

    # 2 ─ Location
    city: str
    state: Optional[str] = None
    country: str

    # 3 ─ Availability
    availability: AvailabilityPayload

    # 4 ─ Skills
    skills: List[str] = Field(..., min_items=1)

    # 5 ─ Education
    educations: List[EducationPayload] = Field(..., min_items=1)


# ──────────────────────────────────────────────────────────────────────────────
# 🛠️  Tool implementation exposed to the agent
# ──────────────────────────────────────────────────────────────────────────────
@tool
def set_profile_fields_v1(
    *,
    user_email: str,
    payload_json: str,
) -> str:
    """
    Persist the given profile fields to the database and return ``"profile_updated"``.

    Parameters
    ----------
    user_email
        (Injected by the agent wrapper) the logged-in user’s e-mail.
    payload_json
        JSON string that must validate against ``ProfilePayload``.
    """
    # 1) Validate & coerce ----------------------------------------------------
    try:
        data = ProfilePayload.model_validate_json(payload_json).model_dump()
    except ValidationError as exc:  # let the agent re-phrase the error
        raise ValueError(str(exc)) from exc

    # 2) Transform for our serializer ----------------------------------------
    availability = data.pop("availability")
    skills = data.pop("skills")
    educations = data.pop("educations")

    data["availability"] = availability
    data["skills"] = [{"name": s} for s in skills]
    data["educations"] = educations

    # 3) Write to DB atomically ----------------------------------------------
    user = User.objects.get(email=user_email)
    profile, _ = Profile.objects.get_or_create(user=user)

    with transaction.atomic():
        serializer = ProfileSerializer(instance=profile, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

    return "profile_updated"
