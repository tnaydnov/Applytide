"""Add foreign keys, unique constraints, and widen totp_secret column

Revision ID: 20250615_fk_constraints
Revises: 3c7de1a9b0c7
Create Date: 2025-06-15 00:00:00

Changes:
    - Add missing ForeignKey constraints across 14 columns
    - Add 3 unique constraints (application, match_result, user_preferences)
    - Widen totp_secret from varchar(64) to varchar(256) for encrypted values
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20250615_fk_constraints'
down_revision = '3c7de1a9b0c7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── ForeignKey constraints ─────────────────────────────────────────

    # jobs
    op.create_foreign_key(
        "fk_jobs_user_id", "jobs", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_jobs_company_id", "jobs", "companies",
        ["company_id"], ["id"], ondelete="SET NULL",
    )

    # resumes
    op.create_foreign_key(
        "fk_resumes_user_id", "resumes", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )

    # applications
    op.create_foreign_key(
        "fk_applications_user_id", "applications", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_applications_job_id", "applications", "jobs",
        ["job_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_applications_resume_id", "applications", "resumes",
        ["resume_id"], ["id"], ondelete="SET NULL",
    )

    # stages
    op.create_foreign_key(
        "fk_stages_application_id", "stages", "applications",
        ["application_id"], ["id"], ondelete="CASCADE",
    )

    # notes
    op.create_foreign_key(
        "fk_notes_application_id", "notes", "applications",
        ["application_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_notes_user_id", "notes", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )

    # match_results
    op.create_foreign_key(
        "fk_match_results_user_id", "match_results", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_match_results_resume_id", "match_results", "resumes",
        ["resume_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_match_results_job_id", "match_results", "jobs",
        ["job_id"], ["id"], ondelete="CASCADE",
    )

    # application_attachments
    op.create_foreign_key(
        "fk_app_attachments_application_id", "application_attachments", "applications",
        ["application_id"], ["id"], ondelete="CASCADE",
    )

    # refresh_tokens
    op.create_foreign_key(
        "fk_refresh_tokens_user_id", "refresh_tokens", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )

    # email_actions
    op.create_foreign_key(
        "fk_email_actions_user_id", "email_actions", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )

    # user_preferences
    op.create_foreign_key(
        "fk_user_preferences_user_id", "user_preferences", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )

    # reminder_notes
    op.create_foreign_key(
        "fk_reminder_notes_reminder_id", "reminder_notes", "reminders",
        ["reminder_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_reminder_notes_user_id", "reminder_notes", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )

    # ── Unique constraints ─────────────────────────────────────────────

    op.create_unique_constraint(
        "uq_user_job_application", "applications",
        ["user_id", "job_id"],
    )
    op.create_unique_constraint(
        "uq_resume_job_match", "match_results",
        ["resume_id", "job_id"],
    )
    op.create_unique_constraint(
        "uq_user_preference_key", "user_preferences",
        ["user_id", "preference_key"],
    )

    # ── Widen totp_secret for encrypted values ─────────────────────────

    op.alter_column(
        "users", "totp_secret",
        existing_type=sa.String(64),
        type_=sa.String(256),
        existing_nullable=True,
    )


def downgrade() -> None:
    # ── Revert totp_secret width ───────────────────────────────────────
    op.alter_column(
        "users", "totp_secret",
        existing_type=sa.String(256),
        type_=sa.String(64),
        existing_nullable=True,
    )

    # ── Drop unique constraints ────────────────────────────────────────
    op.drop_constraint("uq_user_preference_key", "user_preferences", type_="unique")
    op.drop_constraint("uq_resume_job_match", "match_results", type_="unique")
    op.drop_constraint("uq_user_job_application", "applications", type_="unique")

    # ── Drop foreign keys (reverse order) ──────────────────────────────
    op.drop_constraint("fk_reminder_notes_user_id", "reminder_notes", type_="foreignkey")
    op.drop_constraint("fk_reminder_notes_reminder_id", "reminder_notes", type_="foreignkey")
    op.drop_constraint("fk_user_preferences_user_id", "user_preferences", type_="foreignkey")
    op.drop_constraint("fk_email_actions_user_id", "email_actions", type_="foreignkey")
    op.drop_constraint("fk_refresh_tokens_user_id", "refresh_tokens", type_="foreignkey")
    op.drop_constraint("fk_app_attachments_application_id", "application_attachments", type_="foreignkey")
    op.drop_constraint("fk_match_results_job_id", "match_results", type_="foreignkey")
    op.drop_constraint("fk_match_results_resume_id", "match_results", type_="foreignkey")
    op.drop_constraint("fk_match_results_user_id", "match_results", type_="foreignkey")
    op.drop_constraint("fk_notes_user_id", "notes", type_="foreignkey")
    op.drop_constraint("fk_notes_application_id", "notes", type_="foreignkey")
    op.drop_constraint("fk_stages_application_id", "stages", type_="foreignkey")
    op.drop_constraint("fk_applications_resume_id", "applications", type_="foreignkey")
    op.drop_constraint("fk_applications_job_id", "applications", type_="foreignkey")
    op.drop_constraint("fk_applications_user_id", "applications", type_="foreignkey")
    op.drop_constraint("fk_resumes_user_id", "resumes", type_="foreignkey")
    op.drop_constraint("fk_jobs_company_id", "jobs", type_="foreignkey")
    op.drop_constraint("fk_jobs_user_id", "jobs", type_="foreignkey")
