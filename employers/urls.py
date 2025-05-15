from django.urls import path

from .views import EmployerMeView

app_name = "employers"

urlpatterns = [
    path("employer/me/", EmployerMeView.as_view(), name="employer-me"),
    path("employer/me", EmployerMeView.as_view()),  # no-slash variant
]
