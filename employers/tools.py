# employers/tools.py
from __future__ import annotations

import json
import logging
from typing import Optional

from agents import function_tool as tool
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from pydantic import BaseModel, ValidationError

from internships.models import Internship

from .models import Employer
from .serializers import EmployerSerializer

log = logging.getLogger(__name__)
User = get_user_model()


# ─────────────────────────── Pydantic payload schemas ───────────────────────────
class CompanyProfilePayload(BaseModel):
    """Fields for updating an employer's company profile."""

    company_name: Optional[str] = None
    mission: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None


class InternshipPayload(BaseModel):
    """Fields for creating or updating an internship listing."""

    id: Optional[int] = None  # Listing ID (for updates; omit for new listings)
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    requirements: Optional[str] = None


# ─────────────────────────── Function tools for agent ───────────────────────────
@tool
def set_company_fields_v1(*, user_email: str, payload_json: str) -> str:
    """
    Persist employer profile fields for `user_email` (partial updates allowed).
    """
    # 1) Log raw payload
    print(f"[COMPANY TOOL - RAW   ] {user_email}: {payload_json.replace(chr(10), ' ')}")
    log.info(
        "RAW company payload for %s: %s", user_email, payload_json.replace("\n", " ")
    )
    # 2) Validate and parse JSON payload
    try:
        data: dict = CompanyProfilePayload.model_validate_json(payload_json).model_dump(
            exclude_none=True
        )
    except ValidationError as exc:
        print(f"[COMPANY TOOL - ERROR ] {user_email}: {exc}")
        log.warning("❌ ValidationError in company payload for %s: %s", user_email, exc)
        raise ValueError(str(exc)) from exc
    # 3) Perform DB update
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)
    if data:
        with transaction.atomic():
            serializer = EmployerSerializer(instance=employer, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
    # 4) Log success and prepare result
    saved_json = json.dumps(data, default=str)
    print(f"[COMPANY TOOL - SAVED ] {user_email}: {saved_json}")
    log.info("✅ Saved company profile for %s: %s", user_email, saved_json)
    # 5) Return agent response
    if settings.DEBUG:
        return f"company_profile_updated | saved={saved_json}"
    return "company_profile_updated"


@tool
def set_internship_fields_v1(*, user_email: str, payload_json: str) -> str:
    """
    Create or update an internship listing for the employer `user_email`.
    Provide an 'id' to update an existing listing, or omit 'id' to create a new listing.
    Partial updates are allowed when updating.
    """
    # 1) Log raw payload
    print(f"[LISTING TOOL - RAW   ] {user_email}: {payload_json.replace(chr(10), ' ')}")
    log.info(
        "RAW listing payload for %s: %s", user_email, payload_json.replace("\n", " ")
    )
    # 2) Validate and parse JSON payload
    try:
        data: dict = InternshipPayload.model_validate_json(payload_json).model_dump(
            exclude_none=True
        )
    except ValidationError as exc:
        print(f"[LISTING TOOL - ERROR ] {user_email}: {exc}")
        log.warning("❌ ValidationError in listing payload for %s: %s", user_email, exc)
        raise ValueError(str(exc)) from exc
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)
    listing_id = data.pop("id", None) if "id" in data else None
    created_new = False
    # 3) Update existing listing if ID is provided
    if listing_id:
        try:
            internship = Internship.objects.get(id=listing_id, employer=employer)
        except Internship.DoesNotExist:
            raise ValueError(
                f"No internship found with id {listing_id} for this employer."
            )
        if data:
            try:
                for field, value in data.items():
                    setattr(internship, field, value)
                internship.full_clean()
            except DjangoValidationError as exc:
                print(f"[LISTING TOOL - ERROR ] {user_email}: {exc}")
                log.warning(
                    "❌ ValidationError updating listing %s for %s: %s",
                    listing_id,
                    user_email,
                    exc,
                )
                raise ValueError(str(exc)) from exc
            internship.save()
    # 4) Create new listing if no ID
    else:
        if "title" not in data or "description" not in data:
            raise ValueError(
                "Title and description are required to create a new internship listing."
            )
        internship = Internship(employer=employer, **data)
        try:
            internship.full_clean()
        except DjangoValidationError as exc:
            print(f"[LISTING TOOL - ERROR ] {user_email}: {exc}")
            log.warning(
                "❌ ValidationError creating listing for %s: %s", user_email, exc
            )
            raise ValueError(str(exc)) from exc
        internship.save()
        created_new = True
    # 5) Log success and prepare result
    saved_fields = data.copy()
    if listing_id:
        saved_fields["id"] = listing_id
    elif created_new:
        saved_fields["id"] = internship.id
    saved_json = json.dumps(saved_fields, default=str)
    print(f"[LISTING TOOL - SAVED ] {user_email}: {saved_json}")
    log.info("✅ Saved internship listing for %s: %s", user_email, saved_json)
    result_message = "listing_created" if created_new else "listing_updated"
    if settings.DEBUG:
        result_message += f" | saved={saved_json}"
    return result_message
