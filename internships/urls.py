from django.urls import path

from .agent_views import ApplicationAgentView  # ← NEW import
from .views import (
    ApplicationDetail,
    ApplicationList,
    InternshipDetail,
    InternshipListCreate,
)

app_name = "internships"

urlpatterns = [
    # Internship listings
    path("internships/", InternshipListCreate.as_view(), name="internship-list"),
    path("internships", InternshipListCreate.as_view()),  # no-slash fallback
    path(
        "internships/<int:pk>/",
        InternshipDetail.as_view(),
        name="internship-detail",
    ),
    path("internships/<int:pk>", InternshipDetail.as_view()),
    # Applications per internship & application detail
    path(
        "internships/<int:pk>/applications/",
        ApplicationList.as_view(),
        name="internship-applications",
    ),
    path("internships/<int:pk>/applications", ApplicationList.as_view()),
    path(
        "applications/<int:pk>/",
        ApplicationDetail.as_view(),
        name="application-detail",
    ),
    path("applications/<int:pk>", ApplicationDetail.as_view()),
    # ──────────────── NEW AGENT ENDPOINT ────────────────
    path(
        "agent/application-assistant/<int:pk>/",
        ApplicationAgentView.as_view(),
        name="application-agent",
    ),
    path(
        "agent/application-assistant/<int:pk>",
        ApplicationAgentView.as_view(),
    ),
]
