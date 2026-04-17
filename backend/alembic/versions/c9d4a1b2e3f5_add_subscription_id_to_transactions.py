"""Add subscription_id to transactions

Revision ID: c9d4a1b2e3f5
Revises: b3e7f92a1c04
Create Date: 2026-04-17 13:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c9d4a1b2e3f5'
down_revision: Union[str, None] = 'b3e7f92a1c04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transactions',
        sa.Column('subscription_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'fk_transactions_subscription_id',
        'transactions', 'subscriptions',
        ['subscription_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_transactions_subscription_id', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'subscription_id')
