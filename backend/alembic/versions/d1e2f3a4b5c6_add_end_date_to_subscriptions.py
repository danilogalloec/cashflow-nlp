"""Add end_date to subscriptions

Revision ID: d1e2f3a4b5c6
Revises: c9d4a1b2e3f5
Create Date: 2026-04-17 14:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c9d4a1b2e3f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('subscriptions', sa.Column('end_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('subscriptions', 'end_date')
