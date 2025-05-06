"""
OpenAI-Agents tool: create or update an intern’s profile.

The Pipeline Profile-Builder agent will call
`set_profile_fields_v1(payload_json=…)` exactly **once** after it has gathered
all required profile data from the user.
"""

from __future__ import annotations

import datetime as _dt
from typing import List, Literal, Optional

from agents import function_tool as tool  # ← decorator alias
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
    hours_per_week: Optional[int] = Field(
        None, ge=1, le=99, description="Approximate weekly availability"
    )
    remote_ok: bool = True
    onsite_ok: bool = False

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
# 🛠️  Tool implementation
# ──────────────────────────────────────────────────────────────────────────────
@tool  # no extra kwargs → schema stays “primitive-only”
def set_profile_fields_v1(*, user_email: str, payload_json: str) -> str:  # noqa: D401
    """
    Persist the given profile fields to the database.

    Args
    ----
    user_email:
        Email of the logged-in user (injected by the agent runtime).
    payload_json:
        A JSON string that validates against the ``ProfilePayload`` schema.

    Returns
    -------
    str
        The literal string ``"profile_updated"`` on success.

    Raises
    ------
    ValueError
        If payload validation fails (message bubbled up for the agent to re-phrase).
    """
    # 1) Validate & coerce with Pydantic -------------------------------------
    try:
        data = ProfilePayload.model_validate_json(payload_json).model_dump()
    except ValidationError as exc:  # pragma: no cover
        raise ValueError(str(exc)) from exc

    # 2) Transform for DRF serializer ----------------------------------------
    availability_dict = data.pop("availability")
    skills_list = data.pop("skills")
    educations_list = data.pop("educations")

    data["availability"] = availability_dict
    data["skills"] = [{"name": s} for s in skills_list]
    data["educations"] = educations_list

    # 3) Write to DB atomically ----------------------------------------------
    user = User.objects.get(email=user_email)
    profile, _ = Profile.objects.get_or_create(user=user)

    with transaction.atomic():
        serializer = ProfileSerializer(instance=profile, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

    return "profile_updated"
