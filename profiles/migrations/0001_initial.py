# Generated by Django 5.2 on 2025-05-06 23:36

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Skill",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=128, unique=True)),
            ],
            options={
                "ordering": ("name",),
            },
        ),
        migrations.CreateModel(
            name="Profile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("headline", models.CharField(max_length=120)),
                ("bio", models.TextField()),
                ("city", models.CharField(max_length=80)),
                ("state", models.CharField(blank=True, max_length=80)),
                ("country", models.CharField(default="USA", max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "skills",
                    models.ManyToManyField(
                        blank=True, related_name="profiles", to="profiles.skill"
                    ),
                ),
            ],
            options={
                "ordering": ("user__email",),
            },
        ),
        migrations.CreateModel(
            name="Education",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("institution", models.CharField(max_length=120)),
                ("degree", models.CharField(blank=True, max_length=120)),
                ("field_of_study", models.CharField(blank=True, max_length=120)),
                ("start_date", models.DateField()),
                ("end_date", models.DateField(blank=True, null=True)),
                (
                    "gpa",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=4, null=True
                    ),
                ),
                ("description", models.TextField(blank=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="educations",
                        to="profiles.profile",
                    ),
                ),
            ],
            options={
                "ordering": ("-start_date",),
            },
        ),
        migrations.CreateModel(
            name="Availability",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("IMMEDIATELY", "Immediately"),
                            ("FROM_DATE", "From date"),
                            ("UNAVAILABLE", "Unavailable"),
                        ],
                        default="IMMEDIATELY",
                        max_length=20,
                    ),
                ),
                ("earliest_start", models.DateField(blank=True, null=True)),
                (
                    "hours_per_week",
                    models.PositiveSmallIntegerField(blank=True, null=True),
                ),
                ("remote_ok", models.BooleanField(default=True)),
                ("onsite_ok", models.BooleanField(default=False)),
                (
                    "profile",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="availability",
                        to="profiles.profile",
                    ),
                ),
            ],
        ),
    ]
