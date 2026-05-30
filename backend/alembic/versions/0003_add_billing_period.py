"""Add billing_period to organizations

Revision ID: 0003_billing_period
Revises: 0002_add_agent_keys_subscriptions_usage
Create Date: 2026-05-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '0003_billing_period'
down_revision: Union[str, None] = '0002_agent_keys_subs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column(
        'billing_period',
        sa.String(length=20),
        nullable=False,
        server_default='monthly',
    ))


def downgrade() -> None:
    op.drop_column('organizations', 'billing_period')
