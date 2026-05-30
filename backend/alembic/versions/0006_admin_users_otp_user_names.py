"""Admin users + OTP codes, and users first_name/last_name/email_verified

Revision ID: 0006_admin_otp_names
Revises: 0005_llm_models
Create Date: 2026-05-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0006_admin_otp_names'
down_revision: Union[str, None] = '0005_llm_models'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === admin_users ===
    op.create_table(
        'admin_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False, server_default=''),
        sa.Column('last_name', sa.String(100), nullable=False, server_default=''),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('invite_token_hash', sa.String(255), nullable=True),
        sa.Column('invite_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_admin_users_email'),
    )
    op.create_index('ix_admin_users_email', 'admin_users', ['email'])

    # === otp_codes ===
    op.create_table(
        'otp_codes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('code_hash', sa.String(255), nullable=False),
        sa.Column('purpose', sa.String(40), nullable=False),
        sa.Column('subject_type', sa.String(20), nullable=False),
        sa.Column('subject_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('consumed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_otp_codes_email', 'otp_codes', ['email'])

    # === users: first_name / last_name / email_verified ===
    op.add_column('users', sa.Column('first_name', sa.String(100), nullable=False, server_default=''))
    op.add_column('users', sa.Column('last_name', sa.String(100), nullable=False, server_default=''))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))

    # Data migration: seed first_name from existing full_name/username; mark existing verified
    op.execute("UPDATE users SET first_name = COALESCE(NULLIF(full_name, ''), username, '')")
    op.execute("UPDATE users SET email_verified = true")

    # Drop the old username unique index + columns
    op.drop_index('ix_users_username', table_name='users')
    op.drop_column('users', 'username')
    op.drop_column('users', 'full_name')


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported for 0006_admin_otp_names")
