from django.urls import path

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
    path("internships", InternshipListCreate.as_view()),
    path("internships/<int:pk>/", InternshipDetail.as_view(), name="internship-detail"),
    path("internships/<int:pk>", InternshipDetail.as_view()),
    # **New:** Applications per internship and application detail
    path(
        "internships/<int:pk>/applications/",
        ApplicationList.as_view(),
        name="internship-applications",
    ),
    path("internships/<int:pk>/applications", ApplicationList.as_view()),
    path(
        "applications/<int:pk>/", ApplicationDetail.as_view(), name="application-detail"
    ),
    path("applications/<int:pk>", ApplicationDetail.as_view()),
]
