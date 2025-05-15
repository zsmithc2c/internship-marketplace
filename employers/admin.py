from django.contrib import admin

from .models import Employer


@admin.register(Employer)
class EmployerAdmin(admin.ModelAdmin):
    list_display = ("user", "company_name", "location")
    search_fields = ("company_name", "user__email")
