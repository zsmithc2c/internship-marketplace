# employers/urls.py
from django.urls import path

from .agent_views import AgentHistoryView, EmployerAgentView
from .views import EmployerMeView

app_name = "employers"

urlpatterns = [
    # ── Employer profile endpoints ─────────────────────────────
    path("employer/me/", EmployerMeView.as_view(), name="employer-me"),
    path("employer/me", EmployerMeView.as_view()),  # no-slash variant
    # ── Employer AI assistant endpoints ────────────────────────
    path(
        "agent/employer-assistant/",
        EmployerAgentView.as_view(),
        name="agent-employer-assistant",
    ),
    path("agent/employer-assistant", EmployerAgentView.as_view()),
    path(
        "agent/employer-assistant/history/",
        AgentHistoryView.as_view(),
        name="agent-employer-history",
    ),
    path("agent/employer-assistant/history", AgentHistoryView.as_view()),
]
