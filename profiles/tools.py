"""
OpenAI-Agents tool: create or update an intern’s profile
(Incremental-save edition, now with unconditional console prints).

Changes (2025-05-07)
────────────────────
• All top-level `ProfilePayload` fields are Optional ⇒ supports incremental saves
• Added **print()** lines so every attempt and result is visible in the run-server
  terminal, even if the Django logger chain mis-behaves
• Still logs via logging.getLogger(__name__) for structured output
"""

from __future__ import annotations

import datetime as _dt
import json
import logging
from typing import List, Literal, Optional

from agents import function_tool as tool
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from pydantic import BaseModel, Field, ValidationError, validator

from .models import Profile
from .serializers import ProfileSerializer

# ──────────────────────────────────────────────────────────────
# logging
# ──────────────────────────────────────────────────────────────
log = logging.getLogger(__name__)
User = get_user_model()


# ──────────────────────────────────────────────────────────────
# Pydantic payload schemas
# ──────────────────────────────────────────────────────────────
class AvailabilityPayload(BaseModel):
    status: Literal["IMMEDIATELY", "FROM_DATE", "UNAVAILABLE"]
    earliest_start: Optional[_dt.date] = Field(
        None, description="YYYY-MM-DD – required when status == FROM_DATE"
    )
    hours_per_week: Optional[int] = Field(None, ge=1, le=99)
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
    # 1 — Basics
    headline: Optional[str] = None
    bio: Optional[str] = None

    # 2 — Location
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

    # 3 — Availability
    availability: Optional[AvailabilityPayload] = None

    # 4 — Skills
    skills: Optional[List[str]] = None

    # 5 — Education
    educations: Optional[List[EducationPayload]] = None


# ──────────────────────────────────────────────────────────────
# Tool exposed to the agent
# ──────────────────────────────────────────────────────────────
@tool
def set_profile_fields_v1(*, user_email: str, payload_json: str) -> str:
    """
    Persist profile fields for `user_email` (may be partial).

    Always prints the raw payload, any validation error, and the final data
    saved so you can watch the process live in the Dev-server console.
    """
    # 1) raw payload — always visible
    print(f"[PROFILE TOOL - RAW   ] {user_email}: {payload_json.replace(chr(10),' ')}")
    log.info(
        "RAW payload_json from agent (%s): %s",
        user_email,
        payload_json.replace("\n", " "),
    )

    # 2) validate & coerce
    try:
        data: dict = ProfilePayload.model_validate_json(payload_json).model_dump(
            exclude_none=True
        )
    except ValidationError as exc:
        print(f"[PROFILE TOOL - ERROR ] {user_email}: {exc}")
        log.warning("❌ ValidationError for %s: %s", user_email, exc)
        raise ValueError(str(exc)) from exc

    # 3) split nested
    availability = data.pop("availability", None)
    skills = data.pop("skills", None)
    educations = data.pop("educations", None)

    if availability is not None:
        data["availability"] = availability
    if skills is not None:
        data["skills"] = [{"name": s} for s in skills]
    if educations is not None:
        data["educations"] = educations

    # 4) DB write
    user = User.objects.get(email=user_email)
    profile, _ = Profile.objects.get_or_create(user=user)

    with transaction.atomic():
        serializer = ProfileSerializer(instance=profile, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

    # 5) success — always visible
    saved_json = json.dumps(data, default=str)
    print(f"[PROFILE TOOL - SAVED ] {user_email}: {saved_json}")
    log.info("✅ Saved for %s: %s", user_email, saved_json)

    # 6) agent response
    if settings.DEBUG:
        return f"profile_updated | saved={saved_json}"
    return "profile_updated"
