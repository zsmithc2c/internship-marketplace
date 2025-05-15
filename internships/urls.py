from django.urls import path

from .views import InternshipDetail, InternshipListCreate

app_name = "internships"

urlpatterns = [
    path("internships/", InternshipListCreate.as_view(), name="internship-list"),
    path("internships", InternshipListCreate.as_view()),
    path("internships/<int:pk>/", InternshipDetail.as_view(), name="internship-detail"),
    path("internships/<int:pk>", InternshipDetail.as_view()),
]
