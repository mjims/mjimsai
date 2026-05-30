"""WhatsApp module: plans.whatsapp_enabled + whatsapp_configs table

Revision ID: 0008_whatsapp
Revises: 0007_payments_sebpay
Create Date: 2026-05-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0008_whatsapp'
down_revision: Union[str, None] = '0007_payments_sebpay'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('plans', sa.Column('whatsapp_enabled', sa.Boolean(), nullable=False, server_default='false'))

    op.create_table(
        'whatsapp_configs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('phone_number_id', sa.String(50), nullable=True),
        sa.Column('display_phone_number', sa.String(30), nullable=True),
        sa.Column('access_token_enc', sa.String(1000), nullable=True),
        sa.Column('app_secret_enc', sa.String(500), nullable=True),
        sa.Column('verify_token', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('agent_id', name='uq_whatsapp_configs_agent'),
    )
    op.create_index('ix_whatsapp_configs_agent_id', 'whatsapp_configs', ['agent_id'])


def downgrade() -> None:
    op.drop_index('ix_whatsapp_configs_agent_id', table_name='whatsapp_configs')
    op.drop_table('whatsapp_configs')
    op.drop_column('plans', 'whatsapp_enabled')
