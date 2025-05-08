# profiles/urls.py
from django.urls import path

from .agent_views import AgentHistoryView, ProfileBuilderAgentView
from .views import ProfileMeView, SkillListView

app_name = "profiles"

urlpatterns = [
    # ── profile & skills ─────────────────────────────
    path("profile/me/", ProfileMeView.as_view(), name="profile-me"),
    path("profile/me", ProfileMeView.as_view()),  # no-slash
    path("skills/", SkillListView.as_view(), name="skill-list"),
    path("skills", SkillListView.as_view()),  # no-slash
    # ── agent chat & save ────────────────────────────
    path(
        "agent/profile-builder/",
        ProfileBuilderAgentView.as_view(),
        name="agent-profile-builder",
    ),
    path("agent/profile-builder", ProfileBuilderAgentView.as_view()),  # no-slash
    # ── chat history ────────────────────────────────
    path(
        "agent/profile-builder/history/",
        AgentHistoryView.as_view(),
        name="agent-history",
    ),
    path("agent/profile-builder/history", AgentHistoryView.as_view()),  # no-slash
]
