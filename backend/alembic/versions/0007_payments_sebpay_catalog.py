"""Payment settings + Sebpay catalog (countries, operators)

Revision ID: 0007_payments_sebpay
Revises: 0006_admin_otp_names
Create Date: 2026-05-30 00:00:00.000000

"""
import os
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0007_payments_sebpay'
down_revision: Union[str, None] = '0006_admin_otp_names'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_DEFAULT_SEBPAY_BASE_URL = "https://newapi.sebpay.bj/api/v1"

# (code, name, prefix, currency)
_COUNTRIES = [
    ("BJ", "Bénin", "+229", "XOF"),
    ("BF", "Burkina Faso", "+226", "XOF"),
    ("CM", "Cameroun", "+237", "XAF"),
    ("CG", "Congo", "+242", "XAF"),
    ("CI", "Côte d'Ivoire", "+225", "XOF"),
    ("GA", "Gabon", "+241", "XAF"),
    ("GM", "Gambie", "+220", "GMD"),
    ("GN", "Guinée Conakry", "+224", "GNF"),
    ("GW", "Guinée-Bissau", "+245", "XOF"),
    ("ML", "Mali", "+223", "XOF"),
    ("NE", "Niger", "+227", "XOF"),
    ("CD", "R.D.C", "+243", "CDF"),
    ("SN", "Sénégal", "+221", "XOF"),
    ("TD", "Tchad", "+235", "XOF"),
    ("TG", "Togo", "+228", "XOF"),
]

# (slug, label) — seeded as global (country_code NULL); admin refines per country.
_OPERATORS = [
    ("mtn", "MTN Mobile Money"),
    ("moov", "Moov Money"),
    ("orange", "Orange Money"),
    ("wav", "Wave"),
]


def upgrade() -> None:
    # === payment_settings ===
    op.create_table(
        'payment_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(30), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('secret_key_enc', sa.String(500), nullable=True),
        sa.Column('public_key_enc', sa.String(500), nullable=True),
        sa.Column('webhook_secret_enc', sa.String(500), nullable=True),
        sa.Column('base_url', sa.String(255), nullable=True),
        sa.Column('environment', sa.String(20), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider', name='uq_payment_settings_provider'),
    )
    op.create_index('ix_payment_settings_provider', 'payment_settings', ['provider'])

    # === sebpay_countries ===
    op.create_table(
        'sebpay_countries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(5), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('prefix', sa.String(8), nullable=False),
        sa.Column('currency', sa.String(5), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_sebpay_countries_code'),
    )
    op.create_index('ix_sebpay_countries_code', 'sebpay_countries', ['code'])

    # === sebpay_operators ===
    op.create_table(
        'sebpay_operators',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('slug', sa.String(20), nullable=False),
        sa.Column('label', sa.String(50), nullable=False),
        sa.Column('country_code', sa.String(5), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('country_code', 'slug', name='uq_sebpay_operator_country_slug'),
    )
    op.create_index('ix_sebpay_operators_country_code', 'sebpay_operators', ['country_code'])

    now = datetime.now(timezone.utc)

    # Seed payment providers (secrets stay NULL → env fallback; enabled if env set).
    payment_settings = sa.table(
        'payment_settings',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('provider', sa.String),
        sa.column('is_enabled', sa.Boolean),
        sa.column('base_url', sa.String),
        sa.column('environment', sa.String),
        sa.column('updated_at', sa.DateTime(timezone=True)),
    )
    stripe_enabled = bool(os.environ.get("STRIPE_SECRET_KEY"))
    sebpay_enabled = bool(os.environ.get("SEBPAY_SECRET_KEY") and os.environ.get("SEBPAY_PUBLIC_KEY"))
    op.bulk_insert(payment_settings, [
        {'id': uuid.uuid4(), 'provider': 'stripe', 'is_enabled': stripe_enabled,
         'base_url': None, 'environment': None, 'updated_at': now},
        {'id': uuid.uuid4(), 'provider': 'sebpay', 'is_enabled': sebpay_enabled,
         'base_url': _DEFAULT_SEBPAY_BASE_URL,
         'environment': os.environ.get("SEBPAY_ENV", "sandbox"), 'updated_at': now},
    ])

    # Seed countries
    countries = sa.table(
        'sebpay_countries',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('code', sa.String), sa.column('name', sa.String),
        sa.column('prefix', sa.String), sa.column('currency', sa.String),
        sa.column('is_active', sa.Boolean), sa.column('sort_order', sa.Integer),
    )
    op.bulk_insert(countries, [
        {'id': uuid.uuid4(), 'code': code, 'name': name, 'prefix': prefix,
         'currency': currency, 'is_active': True, 'sort_order': i}
        for i, (code, name, prefix, currency) in enumerate(_COUNTRIES)
    ])

    # Seed operators (global)
    operators = sa.table(
        'sebpay_operators',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('slug', sa.String), sa.column('label', sa.String),
        sa.column('country_code', sa.String),
        sa.column('is_active', sa.Boolean), sa.column('sort_order', sa.Integer),
    )
    op.bulk_insert(operators, [
        {'id': uuid.uuid4(), 'slug': slug, 'label': label, 'country_code': None,
         'is_active': True, 'sort_order': i}
        for i, (slug, label) in enumerate(_OPERATORS)
    ])


def downgrade() -> None:
    op.drop_index('ix_sebpay_operators_country_code', table_name='sebpay_operators')
    op.drop_table('sebpay_operators')
    op.drop_index('ix_sebpay_countries_code', table_name='sebpay_countries')
    op.drop_table('sebpay_countries')
    op.drop_index('ix_payment_settings_provider', table_name='payment_settings')
    op.drop_table('payment_settings')
