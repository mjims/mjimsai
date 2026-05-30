"""Remove organizations table, add plans table, move agent to user scope, per-agent billing

Revision ID: 0004_rm_org_plans
Revises: 0003_add_billing_period
Create Date: 2026-05-29 00:00:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0004_rm_org_plans'
down_revision: Union[str, None] = '0003_billing_period'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === 1. Create plans table ===
    op.create_table(
        'plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('label', sa.String(100), nullable=False),
        sa.Column('conversations_limit', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('price_monthly_eur', sa.Numeric(10, 2), nullable=True),
        sa.Column('price_semiannual_eur', sa.Numeric(10, 2), nullable=True),
        sa.Column('price_annual_eur', sa.Numeric(10, 2), nullable=True),
        sa.Column('price_monthly_xof', sa.Integer(), nullable=True),
        sa.Column('price_semiannual_xof', sa.Integer(), nullable=True),
        sa.Column('price_annual_xof', sa.Integer(), nullable=True),
        sa.Column('features', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_plans_name'),
    )
    op.create_index('ix_plans_name', 'plans', ['name'], unique=True)

    # === 2. Insert default "free" plan ===
    op.execute("""
        INSERT INTO plans (id, name, label, conversations_limit,
            price_monthly_eur, price_monthly_xof,
            price_semiannual_eur, price_semiannual_xof,
            price_annual_eur, price_annual_xof,
            features, is_active, sort_order, created_at, updated_at)
        VALUES (
            gen_random_uuid(), 'free', 'Gratuit', 100,
            0, 0, 0, 0, 0, 0,
            '["100 conversations/mois", "Widget embeddable", "Tous les providers LLM"]',
            true, 0, NOW(), NOW()
        )
    """)

    # === 3. Add api_key and is_suspended to users ===
    op.add_column('users', sa.Column('api_key', sa.String(128), nullable=True))
    op.add_column('users', sa.Column('is_suspended', sa.Boolean(), nullable=False, server_default='false'))

    # Populate api_key from organizations for existing users (migrate data)
    op.execute("""
        UPDATE users u
        SET api_key = o.api_key
        FROM organizations o
        WHERE u.organization_id = o.id
    """)

    # For any users without api_key (shouldn't happen but just in case)
    op.execute("""
        UPDATE users SET api_key = md5(random()::text || clock_timestamp()::text)
        WHERE api_key IS NULL
    """)

    # Make api_key NOT NULL and UNIQUE
    op.alter_column('users', 'api_key', nullable=False)
    op.create_index('ix_users_api_key', 'users', ['api_key'], unique=True)

    # === 4. Add user_id to agents (from organization) ===
    op.add_column('agents', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Populate user_id: find the owner user of the agent's organization
    op.execute("""
        UPDATE agents a
        SET user_id = (
            SELECT u.id FROM users u
            WHERE u.organization_id = a.organization_id
            ORDER BY u.created_at ASC
            LIMIT 1
        )
    """)

    # For any agents without user_id (orphaned), delete them
    op.execute("DELETE FROM agents WHERE user_id IS NULL")

    # Make user_id NOT NULL and add FK
    op.alter_column('agents', 'user_id', nullable=False)
    op.create_index('ix_agents_user_id', 'agents', ['user_id'])
    op.create_foreign_key('fk_agents_user_id', 'agents', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # === 5. Add agent subscription fields ===
    op.add_column('agents', sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('agents', sa.Column('subscription_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('agents', sa.Column('stripe_subscription_id', sa.String(255), nullable=True))
    op.add_column('agents', sa.Column('sebpay_subscription_ref', sa.String(255), nullable=True))
    # billing_period already exists from migration 0003, but was on organizations — add to agents
    op.add_column('agents', sa.Column('billing_period', sa.String(20), nullable=False, server_default='monthly'))

    op.create_foreign_key('fk_agents_plan_id', 'agents', 'plans', ['plan_id'], ['id'], ondelete='SET NULL')

    # === 6. Modify usage_records: organization_id → agent_id ===
    op.drop_constraint('uq_usage_org_month', 'usage_records', type_='unique')
    op.drop_index('ix_usage_records_organization_id', table_name='usage_records')
    op.drop_column('usage_records', 'organization_id')

    op.add_column('usage_records', sa.Column('agent_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.execute("DELETE FROM usage_records WHERE agent_id IS NULL")
    op.alter_column('usage_records', 'agent_id', nullable=False)
    op.create_index('ix_usage_records_agent_id', 'usage_records', ['agent_id'])
    op.create_unique_constraint('uq_usage_agent_month', 'usage_records', ['agent_id', 'year_month'])
    op.create_foreign_key('fk_usage_records_agent_id', 'usage_records', 'agents', ['agent_id'], ['id'], ondelete='CASCADE')

    # === 7. Drop organization_id from agents (after user_id is set) ===
    op.drop_constraint('agents_organization_id_fkey', 'agents', type_='foreignkey')
    op.drop_column('agents', 'organization_id')

    # === 8. Drop organization fields from users ===
    op.drop_constraint('users_organization_id_fkey', 'users', type_='foreignkey')
    op.drop_column('users', 'organization_id')
    op.drop_column('users', 'role')

    # === 9. Drop organizations table ===
    op.drop_table('organizations')


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade not supported for this migration — "
        "restoring organizations would require data that no longer exists."
    )
