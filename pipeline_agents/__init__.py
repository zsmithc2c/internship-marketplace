# pipeline_agents/__init__.py
"""
Package initialization for Pipeline Agents.

• Adds a compatibility shim so every FunctionTool created by the
  OpenAI Agents SDK exposes **.openai_schema** (SDK ≥ 0.0.16 requirement)
  even if we’re on an older version that only defines **.schema**.

The patch runs *once* when the pipeline_agents package is imported, before
any tools are declared.
"""

from agents import function_tool as _function_tool

# ────────────────── compatibility shim ──────────────────
# Create a dummy FunctionTool instance to reach its class, then
# add a property to that class if it's missing.
_dummy_tool = _function_tool(lambda: None)  # returns FunctionTool instance
ToolClass = _dummy_tool.__class__

if not hasattr(ToolClass, "openai_schema") and hasattr(ToolClass, "schema"):
    # Map .openai_schema -> .schema (read-only proxy)
    ToolClass.openai_schema = property(lambda self: self.schema)  # type: ignore[attr-defined]

del _dummy_tool, ToolClass  # clean-up namespace
# ─────────────────────────────────────────────────────────
