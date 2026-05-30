"""Voice capability: plans.voice_enabled

Revision ID: 0009_voice
Revises: 0008_whatsapp
Create Date: 2026-05-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '0009_voice'
down_revision: Union[str, None] = '0008_whatsapp'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('plans', sa.Column('voice_enabled', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('plans', 'voice_enabled')
