from django.urls import path

from .agent_views import ProfileBuilderAgentView
from .views import ProfileMeView, SkillListView

app_name = "profiles"

urlpatterns = [
    # ---------- profile & skills ----------
    path("profile/me/", ProfileMeView.as_view(), name="profile-me"),
    path("skills/", SkillListView.as_view(), name="skill-list"),
    # ---------- agent ----------
    path(
        "agent/profile-builder/",
        ProfileBuilderAgentView.as_view(),
        name="agent-profile-builder",
    ),
    path(  # allow call without the trailing slash, too
        "agent/profile-builder",
        ProfileBuilderAgentView.as_view(),
    ),
]
