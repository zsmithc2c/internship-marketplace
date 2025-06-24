"""
pipeline_agents/employer_agent.py
─────────────────────────────────────────────────────────────────────────────
Employer-side AI assistant.

Capabilities
• Build / edit the company profile
• Create, update, delete internship listings
• List applicants for a listing
• Fetch current listings (id + title)
• Instruct the front-end to navigate pages
"""

from __future__ import annotations

import json
from datetime import datetime

from agents import Agent, function_tool, set_default_openai_client
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.db import transaction

import employers.tools as _e
from employers.models import Employer
from internships.models import Internship
from pipeline_agents.openai_client import client as async_client

User = get_user_model()


# ─────────────────────────────── schema helper ──────────────────────────────
def _equip_openai_schema(tool):
    """
    Make sure every FunctionTool exposes `.openai_schema` and strip any
    “required” array from the parameters block so the model can send
    partial payloads.
    """
    if not hasattr(tool, "openai_schema") and hasattr(tool, "schema"):
        tool.openai_schema = tool.schema  # type: ignore[attr-defined]
    try:
        tool.openai_schema["function"]["parameters"].pop("required", None)  # type: ignore[index]
    except Exception:
        pass
    return tool


# ──────────────────────────────── DB helpers ────────────────────────────────
def _save_company_sync(user_email: str, data: dict) -> str:
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)

    if data:
        from employers.serializers import EmployerSerializer

        with transaction.atomic():
            ser = EmployerSerializer(instance=employer, data=data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()

    return json.dumps(data, default=str)  # DEBUG snapshot


def _save_listing_sync(user_email: str, data: dict, listing_id: int | None):
    """
    Create or update an internship listing.

    • Normal path: supply an id ⇒ update; omit id ⇒ create.
    • Safety net: if employer has exactly ONE listing and no id supplied,
      treat as an update (prevents accidental duplicates).
    """
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)
    created_new = False

    # ── UPDATE (explicit id) ───────────────────────────────────────────
    if listing_id:
        listing = Internship.objects.get(id=listing_id, employer=employer)
        for k, v in data.items():
            setattr(listing, k, v)
        listing.full_clean()
        listing.save()

    else:
        # ── UPDATE (implicit – only one listing exists) ────────────────
        only_listing = Internship.objects.filter(employer=employer)[:2]
        if len(only_listing) == 1:
            listing = only_listing[0]
            for k, v in data.items():
                setattr(listing, k, v)
            listing.full_clean()
            listing.save()
        # ── CREATE ─────────────────────────────────────────────────────
        else:
            if not {"title", "description"} <= data.keys():
                raise ValueError("title and description are required")
            listing = Internship(employer=employer, **data)
            listing.full_clean()
            listing.save()
            created_new = True

    snap = data.copy() | {"id": listing.id}
    return json.dumps(snap, default=str), created_new


def _list_applicants_sync(user_email: str, listing_id: int) -> str:
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)
    listing = Internship.objects.get(id=listing_id, employer=employer)

    apps = [
        {
            "intern_email": app.intern.email,
            "status": app.status,
            "submitted": datetime.isoformat(app.created_at, "seconds"),
        }
        for app in listing.applications.select_related("intern")
    ]
    return json.dumps(apps, default=str)


def _delete_listing_sync(user_email: str, listing_id: int) -> str:
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)
    listing = Internship.objects.get(id=listing_id, employer=employer)

    snap = {"id": listing.id, "title": listing.title}
    listing.delete()
    return json.dumps(snap, default=str)


def _list_listings_sync(user_email: str) -> str:  # ← fixed variable name
    user = User.objects.get(email=user_email)
    employer, _ = Employer.objects.get_or_create(user=user)
    listings = [
        {"id": listing.id, "title": listing.title, "status": listing.status}
        for listing in Internship.objects.filter(employer=employer).order_by(
            "created_at"
        )
    ]
    return json.dumps(listings, default=str)


# ────────────── FunctionTool: company-profile update ──────────────
def _company_fields_tool_for(user_email: str):
    _KEY_MAP = {
        "name": "company_name",
        "companyName": "company_name",
        "company_name": "company_name",
        "mission": "mission",
        "missionStatement": "mission",
        "mission_statement": "mission",
        "location": "location",
        "website": "website",
    }

    @function_tool
    async def set_company_fields_v1(*, payload_json: str | None = None) -> str:
        if not payload_json or payload_json.strip() in ("{}", "null", ""):
            return "no_changes"
        raw = json.loads(payload_json)
        data = {_KEY_MAP[k]: v for k, v in raw.items() if k in _KEY_MAP}
        if not data:
            return "no_changes"

        saved = await sync_to_async(_save_company_sync, thread_sensitive=True)(
            user_email, data
        )
        from django.conf import settings

        result = "company_profile_updated"
        if settings.DEBUG:
            result += f" | saved={saved}"
        return result

    return _equip_openai_schema(set_company_fields_v1)


# ────────────── FunctionTool: listing create / update ──────────────
def _listing_fields_tool_for(user_email: str):
    @function_tool
    async def set_internship_fields_v1(*, payload_json: str | None = None) -> str:
        if not payload_json or payload_json.strip() in ("{}", "null", ""):
            return "no_changes"

        data = _e.InternshipPayload.model_validate_json(payload_json).model_dump(
            exclude_none=True
        )
        listing_id = data.get("id")
        if listing_id and len(data) == 1:
            return "no_changes"

        snap, created = await sync_to_async(_save_listing_sync, thread_sensitive=True)(
            user_email, data, listing_id
        )
        from django.conf import settings

        result = "listing_created" if created else "listing_updated"
        if settings.DEBUG:
            result += f" | saved={snap}"
        return result

    return _equip_openai_schema(set_internship_fields_v1)


# ────────────── FunctionTool: list CURRENT listings ──────────────
def _list_listings_tool_for(user_email: str):  # ← NEW
    @function_tool
    async def list_listings_v1() -> str:
        data = await sync_to_async(_list_listings_sync, thread_sensitive=True)(
            user_email
        )
        from django.conf import settings

        result = "listings_returned"
        if settings.DEBUG:
            result += f" | listings={data}"
        return result

    return _equip_openai_schema(list_listings_v1)


# ────────────── FunctionTool: list applicants ──────────────
def _listing_applicants_tool_for(user_email: str):
    @function_tool
    async def list_applicants_v1(*, listing_id: int) -> str:
        apps = await sync_to_async(_list_applicants_sync, thread_sensitive=True)(
            user_email, listing_id
        )
        from django.conf import settings

        result = "applicants_listed"
        if settings.DEBUG:
            result += f" | applications={apps}"
        return result

    return _equip_openai_schema(list_applicants_v1)


# ────────────── FunctionTool: delete listing ──────────────
def _listing_delete_tool_for(user_email: str):
    @function_tool
    async def delete_internship_v1(*, listing_id: int) -> str:
        snap = await sync_to_async(_delete_listing_sync, thread_sensitive=True)(
            user_email, listing_id
        )
        from django.conf import settings

        result = "listing_deleted"
        if settings.DEBUG:
            result += f" | deleted={snap}"
        return result

    return _equip_openai_schema(delete_internship_v1)


# ────────────── FunctionTool: front-end navigation ──────────────
def _navigate_tool():
    @function_tool
    async def navigate_to_v1(*, path: str) -> str:
        print(f"[AGENT NAVIGATE] → {path}")
        return "ok"

    return _equip_openai_schema(navigate_to_v1)


# ───────────────────────────── system prompt ─────────────────────────────
_SYSTEM_INSTRUCTIONS = r"""
You are the **Pipeline Employer Assistant** – an upbeat, knowledgeable guide
for companies using the internship marketplace.

Below are your function-tools. **Always call a tool when the user asks to
perform the corresponding action.**

╔═╤══════════════════════════╤════════════════════════════╤════════════════════════════════════╗
║#│ name                     │ what it does               │ arguments schema                  ║
╟─┼──────────────────────────┼────────────────────────────┼────────────────────────────────────╢
║1│ set_company_fields_v1    │ create / update profile    │ { "payload_json": "<JSON-string>" }║
║2│ set_internship_fields_v1 │ create / update listing    │ { "payload_json": "<JSON-string>" }║
║3│ list_listings_v1         │ get existing listings      │ {}                                 ║
║4│ list_applicants_v1       │ list applicants            │ { "listing_id": 123 }              ║
║5│ delete_internship_v1     │ delete a listing           │ { "listing_id": 123 }              ║
║6│ navigate_to_v1           │ change UI page             │ { "path": "/employer/…" }          ║
╚═╧══════════════════════════╧════════════════════════════╧════════════════════════════════════╝

• After gathering data, you may optionally navigate to "/employer/internships#new"
  so the UI opens the creation form automatically.

IMPORTANT RULES
1. Use a tool whenever the user wants to **do** something (save data, delete,
   view applicants, navigate). Otherwise give a normal answer.
2. For tools #1 and #2 send data as a *double-encoded JSON string* in
   `payload_json`.

   Example – set company name & mission  
     {  
       "name": "set_company_fields_v1",  
       "arguments": {  
         "payload_json": "{\"company_name\":\"Rocket Co\",\"mission\":\"Make space cheap\"}"  
       }  
     }

3. **Before editing a listing** call `list_listings_v1` to fetch current IDs,
   then include the correct `id` when using `set_internship_fields_v1`.
   • If exactly one listing exists and the user doesn’t specify an id,
     treat the update as applying to that single listing.

4. Wait for explicit confirmation before deleting data or posting a new listing
   unless the request is crystal-clear.
5. After calling a tool, summarise the result in plain language.
6. Keep replies concise, friendly, action-oriented.
7. If the company profile is incomplete, encourage the user to finish it so
   they can post internships and find matches quickly.

ONBOARDING FLOW
• Greet and introduce yourself.
• Explain that the first step is completing the Company Profile.
  If any of company_name, mission, location or website are missing,
  prompt the user for them.
• Offer to open /employer/profile; on approval call navigate_to_v1 with
  {"path":"/employer/profile"}.
• Gather each profile field and save via set_company_fields_v1 with brief
  confirmations.
• Once the profile looks complete, congratulate them and pivot to making the
  first internship listing. Offer to open /employer/internships#new and call
  navigate_to_v1 if accepted.

INTERNSHIP LISTING WORKFLOW
• Create – gather title, description, location/remote and requirements, then
  call set_internship_fields_v1 (no id).
• Edit – call list_listings_v1 → identify listing → collect changes →
  set_internship_fields_v1 with id (or rely on the single-listing heuristic).
• Delete – confirm intent → delete_internship_v1.
• View applicants – list_applicants_v1 → summarise applicant list.

PAGE NAVIGATION
Use navigate_to_v1 whenever the user asks to open a different page, e.g.
  /employer/internships   /employer/help   etc.

Ready to assist!
"""


# ───────────────────────────── Agent factory ─────────────────────────────
def build_employer_agent(*, user_email: str) -> Agent:
    set_default_openai_client(async_client)
    return Agent(
        name="Employer Assistant",
        instructions=_SYSTEM_INSTRUCTIONS,
        model="gpt-4o",
        tools=[
            _company_fields_tool_for(user_email),
            _listing_fields_tool_for(user_email),
            _list_listings_tool_for(user_email),  # ← NEW
            _listing_applicants_tool_for(user_email),
            _listing_delete_tool_for(user_email),
            _navigate_tool(),
        ],
    )
