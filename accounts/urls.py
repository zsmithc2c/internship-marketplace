from django.urls import path

from .views import LoginView, RefreshView, RegisterView

app_name = "accounts"

urlpatterns = [
    # register
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/register", RegisterView.as_view()),
    # login
    path("auth/token/", LoginView.as_view(), name="token_obtain_pair"),
    path("auth/token", LoginView.as_view()),
    # refresh
    path("auth/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("auth/refresh", RefreshView.as_view()),
]
