# pipeline_agents/employer_agent.py
"""
Employer-Assistant agent configuration.
Similar to pipeline_agents/profile_builder.py, but for employer tasks (company profile & listings).
"""
from __future__ import annotations

import json
from typing import Any, Mapping

from agents import Agent, function_tool, set_default_openai_client
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.db import transaction

import employers.tools as _e  # employer Pydantic models and static tools
from employers.models import Employer
from internships.models import Internship
from pipeline_agents.openai_client import client as async_client

User = get_user_model()


# ───────────────────────── compatibility shim (OpenAI schema) ─────────────────────────
def _equip_openai_schema(tool):
    """
    Ensure each FunctionTool exposes .openai_schema (for OpenAI function calling).
    Also remove any required parameters constraint to allow flexible invocation.
    """
    if not hasattr(tool, "openai_schema") and hasattr(tool, "schema"):
        tool.openai_schema = tool.schema  # type: ignore[attr-defined]
    try:
        params: Mapping[str, Any] = tool.openai_schema["function"]["parameters"]  # type: ignore[index]
        if "required" in params:
            params["required"] = []
    except Exception:
        pass
    return tool


# ───────────────────────── synchronous DB helpers ─────────────────────────
def _save_company_sync(user_email: str, data: dict) -> str:
    """Persist employer profile fields (company info) to the database, returning a JSON snapshot."""
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)
    if data:
        with transaction.atomic():
            from employers.serializers import EmployerSerializer

            serializer = EmployerSerializer(instance=employer, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
    snapshot = {**data}
    return json.dumps(snapshot, default=str)


def _save_listing_sync(
    user_email: str, data: dict, listing_id: int | None
) -> tuple[str, bool]:
    """Create or update an Internship listing; returns (saved_json, created_new_flag)."""
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)
    created_new = False
    if listing_id:
        # Update existing listing
        internship = Internship.objects.get(id=listing_id, employer=employer)
        if data:
            with transaction.atomic():
                for field, value in data.items():
                    setattr(internship, field, value)
                internship.full_clean()
                internship.save()
    else:
        # Create new listing
        if "title" not in data or "description" not in data:
            raise ValueError(
                "Title and description are required to create a new internship listing."
            )
        internship = Internship(employer=employer, **data)
        internship.full_clean()
        internship.save()
        created_new = True
    # Prepare snapshot of saved fields
    snapshot = data.copy()
    if listing_id:
        snapshot["id"] = listing_id
    elif created_new:
        snapshot["id"] = internship.id
    return json.dumps(snapshot, default=str), created_new


# ───────────────────────── FunctionTool factory: update company profile ─────────────────────────
def _company_fields_tool_for(user_email: str):
    """Return a FunctionTool for updating the employer's company profile (per user context)."""

    @function_tool
    async def set_company_fields_v1(*, payload_json: str | None = None) -> str:
        # Ignore empty or no-op calls
        if not payload_json or payload_json.strip() in ("{}", "null", ""):
            return "no_changes"
        print(
            f"[AGENT TOOL - RAW   ] {user_email}: {payload_json.replace(chr(10), ' ')}"
        )
        try:
            data = _e.CompanyProfilePayload.model_validate_json(
                payload_json
            ).model_dump(exclude_none=True)
            saved_json = await sync_to_async(_save_company_sync, thread_sensitive=True)(
                user_email, data
            )
            print(f"[AGENT TOOL - SAVED ] {user_email}: {saved_json}")
            from django.conf import settings

            return (
                f"company_profile_updated | saved={saved_json}"
                if settings.DEBUG
                else "company_profile_updated"
            )
        except Exception as exc:
            print(f"[AGENT TOOL - ERROR ] {user_email}: {exc}")
            # Propagate the exception to be handled by the agent workflow
            raise

    return _equip_openai_schema(set_company_fields_v1)


# ───────────────────────── FunctionTool factory: create/update internship listing ─────────────────────────
def _listing_fields_tool_for(user_email: str):
    """Return a FunctionTool for creating or updating an internship listing (per user context)."""

    @function_tool
    async def set_internship_fields_v1(*, payload_json: str | None = None) -> str:
        if not payload_json or payload_json.strip() in ("{}", "null", ""):
            return "no_changes"
        print(
            f"[AGENT TOOL - RAW   ] {user_email}: {payload_json.replace(chr(10), ' ')}"
        )
        try:
            data = _e.InternshipPayload.model_validate_json(payload_json).model_dump(
                exclude_none=True
            )
            # If only an ID is provided with no other fields, do nothing
            listing_id = data.get("id")
            if listing_id and len(data) == 1:
                return "no_changes"
            saved_json, created_new = await sync_to_async(
                _save_listing_sync, thread_sensitive=True
            )(user_email, data, data.get("id"))
            print(f"[AGENT TOOL - SAVED ] {user_email}: {saved_json}")
            from django.conf import settings

            result = "listing_created" if created_new else "listing_updated"
            if settings.DEBUG:
                result += f" | saved={saved_json}"
            return result
        except Exception as exc:
            print(f"[AGENT TOOL - ERROR ] {user_email}: {exc}")
            raise

    return _equip_openai_schema(set_internship_fields_v1)


# ───────────────────────── FunctionTool: navigate (UI page change) ─────────────────────────
def _navigate_tool():
    """Tool that instructs the front-end to navigate to a different page (by path)."""

    @function_tool
    async def navigate_to_v1(*, path: str) -> str:
        """
        Tell the browser to change to a relative URL, e.g. "/employer/profile".
        """
        print(f"[AGENT NAVIGATE     ] → {path}")
        # The assistant acknowledges; the client will handle the navigation instruction
        return "ok"

    return _equip_openai_schema(navigate_to_v1)


# ───────────────────────── System instructions (for the employer agent) ─────────────────────────
_SYSTEM_INSTRUCTIONS = """
You are the Pipeline Employer Assistant, an upbeat, knowledgeable guide for companies using the internship platform.
Your job is to help employers set up their company profile and manage internship listings efficiently.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀  First-time onboarding (Employers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• If this is the very first message you receive from the user (no prior chat history):
  1. Greet the user and introduce yourself as their employer account assistant.
  2. Briefly explain how you can help (for example, updating their company profile, creating internship postings, and navigating the employer dashboard).
  3. Emphasize that completing the company profile is important to attract the best candidates.
  4. Offer to open the Company Profile page:
     “Would you like me to open your Company Profile page to get started?”
     • If yes ⇒ call **navigate_to_v1** with `{ "path": "/employer/profile" }`.
     • If no ⇒ remain available to assist from the dashboard.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢  Company Profile Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guide the user through updating their company profile:
1. Ask for the company name, mission statement, location, and website (one at a time, in a logical order).
2. After collecting each piece of information or all at once, use **set_company_fields_v1** to save the details.
3. Confirm the updates to the user (e.g., “Great, I’ve updated your company name.”).
4. Once all essential fields are filled, acknowledge that the profile looks complete.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼  Internship Listing Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assist the user in creating or editing internship listings:
• **Creating a new listing:** 
  - Gather the necessary details: title, description, location or whether it's remote, and any specific requirements.
  - Ask follow-up questions if needed to get all required information.
  - When enough info is provided, call **set_internship_fields_v1** (with no 'id') to create the new listing.
  - Confirm the creation (e.g., “Your internship listing has been created.”).
  - Offer to help with another listing or to navigate to the listings page.
• **Editing an existing listing:** 
  - If the user wants to update an existing listing, ask which one (you can reference it by title or other identifier).
  - You might open the internships page for reference if needed (e.g., via **navigate_to_v1** with `{"path": "/employer/internships"}`).
  - Once the specific listing is identified, gather the changes (e.g., new description or requirements).
  - Call **set_internship_fields_v1** with the listing's 'id' and the updated fields.
  - Confirm that the listing has been updated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔎  General Guidance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Keep your responses concise, friendly, and helpful.
- Proactively suggest using the available tools (profile updates or navigation) when it will streamline the user's task.
- If the user asks to go to a different section of the employer dashboard (e.g., viewing all internships, accessing help), use **navigate_to_v1** with the appropriate path (e.g., "/employer/internships", "/employer/help").
- Always wait for the user's confirmation before performing actions like saving data or navigating, if there is any ambiguity in their request.
"""


# ───────────────────────── Agent builder ─────────────────────────
def build_employer_agent(*, user_email: str) -> Agent:
    """Return a configured Agent for employer-side assistance, tied to the given user."""
    set_default_openai_client(async_client)
    return Agent(
        name="Employer Assistant",
        instructions=_SYSTEM_INSTRUCTIONS,
        model="gpt-4o",
        tools=[
            _company_fields_tool_for(user_email),
            _listing_fields_tool_for(user_email),
            _navigate_tool(),
        ],
    )
