"""Add per-agent API keys, subscription fields, and usage records table

Revision ID: 0002_agent_keys_subs
Revises: 0001_initial_schema
Create Date: 2026-05-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0002_agent_keys_subs'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Agents: per-agent LLM API key columns ---
    op.add_column('agents', sa.Column('llm_api_key_encrypted', sa.String(length=500), nullable=True))
    op.add_column('agents', sa.Column('llm_api_key_hint', sa.String(length=20), nullable=True))

    # --- Organizations: subscription/SaaS columns ---
    op.add_column('organizations', sa.Column('plan_conversations_limit', sa.Integer(), nullable=False, server_default='100'))
    op.add_column('organizations', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    op.add_column('organizations', sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True))
    op.add_column('organizations', sa.Column('sebpay_subscription_ref', sa.String(length=255), nullable=True))
    op.add_column('organizations', sa.Column('is_suspended', sa.Boolean(), nullable=False, server_default='false'))

    # --- Usage records table ---
    op.create_table(
        'usage_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('year_month', sa.String(length=7), nullable=False),
        sa.Column('conversations_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('messages_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tokens_input_total', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tokens_output_total', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'year_month', name='uq_usage_org_month'),
    )
    op.create_index('ix_usage_records_organization_id', 'usage_records', ['organization_id'])


def downgrade() -> None:
    op.drop_index('ix_usage_records_organization_id', table_name='usage_records')
    op.drop_table('usage_records')

    op.drop_column('organizations', 'is_suspended')
    op.drop_column('organizations', 'sebpay_subscription_ref')
    op.drop_column('organizations', 'stripe_subscription_id')
    op.drop_column('organizations', 'stripe_customer_id')
    op.drop_column('organizations', 'plan_conversations_limit')

    op.drop_column('agents', 'llm_api_key_hint')
    op.drop_column('agents', 'llm_api_key_encrypted')
