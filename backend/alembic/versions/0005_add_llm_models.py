"""Add llm_models table (admin-managed provider models) + seed current models

Revision ID: 0005_llm_models
Revises: 0004_rm_org_plans
Create Date: 2026-05-30 00:00:00.000000

"""
from typing import Sequence, Union
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0005_llm_models'
down_revision: Union[str, None] = '0004_rm_org_plans'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Default models seeded on first migration. Admin can edit/add/remove these
# from the backoffice afterwards — no code change needed when a model is
# deprecated or a new one ships.
_SEED_MODELS = [
    # provider, model_id, label
    ("anthropic", "claude-opus-4-8", "Claude Opus 4.8"),
    ("anthropic", "claude-sonnet-4-6", "Claude Sonnet 4.6"),
    ("anthropic", "claude-haiku-4-5-20251001", "Claude Haiku 4.5"),
    ("openai", "gpt-5", "GPT-5"),
    ("openai", "gpt-5-mini", "GPT-5 mini"),
    ("openai", "gpt-4.1", "GPT-4.1"),
    ("openai", "gpt-4o", "GPT-4o"),
    ("openai", "gpt-4o-mini", "GPT-4o mini"),
    ("gemini", "gemini-2.5-pro", "Gemini 2.5 Pro"),
    ("gemini", "gemini-2.5-flash", "Gemini 2.5 Flash"),
    ("gemini", "gemini-2.0-flash", "Gemini 2.0 Flash"),
    ("grok", "grok-4", "Grok 4"),
    ("grok", "grok-3", "Grok 3"),
    ("grok", "grok-3-mini", "Grok 3 mini"),
    ("deepseek", "deepseek-chat", "DeepSeek V3 (chat)"),
    ("deepseek", "deepseek-reasoner", "DeepSeek R1 (reasoner)"),
]


def upgrade() -> None:
    op.create_table(
        'llm_models',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('model_id', sa.String(150), nullable=False),
        sa.Column('label', sa.String(150), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider', 'model_id', name='uq_llm_model_provider_model'),
    )
    op.create_index('ix_llm_models_provider', 'llm_models', ['provider'])

    # Seed current models
    llm_models = sa.table(
        'llm_models',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('provider', sa.String),
        sa.column('model_id', sa.String),
        sa.column('label', sa.String),
        sa.column('is_active', sa.Boolean),
        sa.column('sort_order', sa.Integer),
        sa.column('created_at', sa.DateTime(timezone=True)),
        sa.column('updated_at', sa.DateTime(timezone=True)),
    )
    now = datetime.now(timezone.utc)
    op.bulk_insert(
        llm_models,
        [
            {
                'id': uuid.uuid4(),
                'provider': provider,
                'model_id': model_id,
                'label': label,
                'is_active': True,
                'sort_order': idx,
                'created_at': now,
                'updated_at': now,
            }
            for idx, (provider, model_id, label) in enumerate(_SEED_MODELS)
        ],
    )


def downgrade() -> None:
    op.drop_index('ix_llm_models_provider', table_name='llm_models')
    op.drop_table('llm_models')
