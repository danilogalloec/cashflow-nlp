"""Add subscriptions table

Revision ID: b3e7f92a1c04
Revises: feef40f78f3f
Create Date: 2026-04-17 12:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b3e7f92a1c04'
down_revision: Union[str, None] = 'feef40f78f3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('amount', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column(
            'currency',
            postgresql.ENUM('USD', 'EUR', 'GTQ', 'MXN', 'BTC', 'USDT',
                            name='currency_code', create_type=False),
            nullable=False,
        ),
        sa.Column(
            'frequency',
            postgresql.ENUM('once', 'daily', 'weekly', 'biweekly', 'monthly', 'annual',
                            name='income_frequency', create_type=False),
            nullable=False,
        ),
        sa.Column('next_due', sa.Date(), nullable=True),
        sa.Column('category_id', sa.UUID(), nullable=True),
        sa.Column('account_id', sa.UUID(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['account_id'],  ['accounts.id'],  ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'],     ['users.id'],      ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_subscriptions_user_id'), 'subscriptions', ['user_id'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_subscriptions_user_id'), table_name='subscriptions')
    op.drop_table('subscriptions')
