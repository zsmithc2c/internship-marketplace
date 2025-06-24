# pipeline_agents/application_agent.py
"""
Application-Assistant agent.

• Helps an intern craft application materials (cover letter, references, etc.)
  for a specific Internship.
• Does **not** submit the application – it only prepares draft text that the
  frontend will insert into the form.                                      
"""

from __future__ import annotations

import json
from typing import Any, Mapping, Optional

from agents import Agent, function_tool, set_default_openai_client
from pydantic import BaseModel, Field, validator

# Shared async OpenAI client (same one used across agents)
from pipeline_agents.openai_client import client as async_client


# ───────────────────────────────────────────────────────────────
# Helpers for schema shimming (same as profile_builder)
# ───────────────────────────────────────────────────────────────
def _equip_openai_schema(tool):
    """Ensure `.openai_schema` exists + make all params optional."""
    if not hasattr(tool, "openai_schema") and hasattr(tool, "schema"):
        tool.openai_schema = tool.schema  # type: ignore[attr-defined]

    try:
        params: Mapping[str, Any] = tool.openai_schema["function"]["parameters"]  # type: ignore[index]
        if "required" in params:
            params["required"] = []
    except Exception:  # pragma: no cover
        pass
    return tool


# ───────────────────────────────────────────────────────────────
# Payload model for drafts
# ───────────────────────────────────────────────────────────────
class ApplicationDraftPayload(BaseModel):
    """Fields the agent can populate for an application draft."""

    cover_letter: Optional[str] = Field(
        None,
        description="Draft cover-letter text tailored to the internship.",
    )
    references: Optional[str] = Field(
        None,
        description="Formatted references (names / contact info) if requested.",
    )

    @validator("*", pre=True, always=True)
    def strip_or_none(cls, v):  # noqa: D401
        return v.strip() if isinstance(v, str) and v.strip() else None


# ───────────────────────────────────────────────────────────────
# FunctionTool: set_application_fields_v1
# ───────────────────────────────────────────────────────────────
def _application_fields_tool():
    """Return the draft-saving FunctionTool (no DB writes)."""

    @function_tool
    async def set_application_fields_v1(
        *, payload_json: str | None = None  # noqa: N802
    ) -> str:
        """
        Store a draft cover letter / references for the current application
        (frontend will read this from the SSE payload).
        """
        if not payload_json or payload_json.strip() in ("{}", "null", ""):
            return "no_changes"

        # Validate + echo back what was provided
        data = ApplicationDraftPayload.model_validate_json(payload_json).model_dump(
            exclude_none=True
        )
        saved = json.dumps(data, separators=(",", ":"))
        print(f"[AGENT APP-DRAFT] {saved}")
        return f"application_fields_set | saved={saved}"

    return _equip_openai_schema(set_application_fields_v1)


# ───────────────────────────────────────────────────────────────
# FunctionTool: navigate_to_v1 – reuse nav helper
# ───────────────────────────────────────────────────────────────
def _navigate_tool():
    @function_tool
    async def navigate_to_v1(*, path: str) -> str:  # noqa: N802
        """Tell the browser to navigate to another page."""
        print(f"[AGENT NAVIGATE] → {path}")
        return "ok"

    return _equip_openai_schema(navigate_to_v1)


# ───────────────────────────────────────────────────────────────
# Factory
# ───────────────────────────────────────────────────────────────
def build_application_agent(*, user_email: str, internship) -> Agent:
    """
    Return an Agent configured for assisting with a single internship
    application. Pass in the Internship instance for context.
    """

    set_default_openai_client(async_client)

    # Build dynamic system instructions with internship context
    _SYSTEM_TEMPLATE = """
You are Pipeline’s **Application Assistant**.

Your role is to help the student prepare any required materials for the
internship application below.  ✨ **Do NOT submit the application yourself.**
Stop after generating drafts and wait for the student to press “Submit”.

━━━━━━━━━━━━━━━━━━ Internship Context ━━━━━━━━━━━━━━━━━━
• Title: {title}
• Company: {company}
• Remote: {remote}
• Location: {location}
• Description (shortened): {description}

Requirements set by employer:
{req_lines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠 Available tools
────────────────────────────────────────────────────────
1. **set_application_fields_v1**
   • Saves draft fields for the cover_letter and/or references.
   • Takes JSON like:
     {{ "cover_letter": "…", "references": "…" }}

2. **navigate_to_v1**
   • Tell the browser to change pages (e.g. "/internships").
────────────────────────────────────────────────────────

💡 Workflow
• Greet the student in ≤1 sentence.
• Ask if they would like help drafting required materials.
• For a cover letter:
  1. Gather any extra info you need (motivation, project examples, etc.).
  2. Draft a concise, personalized letter (≤ 3 paragraphs).
  3. Call **set_application_fields_v1** with the final text.
  4. Ask if they want revisions.
• For references:
  1. Ask for names / contact info as needed.
  2. Format neatly and save via the tool.
• **Never** call a submit / apply tool.
• End with encouragement to review and click “Submit” themselves.

Style → Friendly, professional, ≤ 4 sentences per reply.
""".strip()

    reqs = []
    if internship.requires_cover_letter:
        reqs.append("- Cover Letter required")
    if internship.requires_resume:
        reqs.append("- Resume upload required (handled via form)")
    if internship.requires_references:
        reqs.append("- References required")
    if internship.external_application_url:
        reqs.append(
            "- EXTERNAL application link set (should *disable* internal drafts)"
        )
    if not reqs:
        reqs.append("- No extra materials required")

    instructions = _SYSTEM_TEMPLATE.format(
        title=internship.title,
        company=internship.employer.company_name or internship.employer.user.email,
        remote="Yes" if internship.is_remote else "No",
        location=internship.location or "Not specified",
        description=(
            (internship.description[:400] + "…")
            if len(internship.description) > 400
            else internship.description
        ),
        req_lines="\n".join(reqs),
    )

    return Agent(
        name="Application Assistant",
        instructions=instructions,
        model="gpt-4o",
        tools=[
            _application_fields_tool(),
            _navigate_tool(),
        ],
    )
