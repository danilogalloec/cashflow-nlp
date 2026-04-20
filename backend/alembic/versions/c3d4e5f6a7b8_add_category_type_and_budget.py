"""Add category_type and monthly_budget to categories

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
Create Date: 2026-04-20 10:00:00.000000
"""
from __future__ import annotations
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column(
        'category_type', sa.String(10), nullable=False, server_default='expense'
    ))
    op.add_column('categories', sa.Column(
        'monthly_budget', sa.Numeric(18, 2), nullable=True
    ))


def downgrade() -> None:
    op.drop_column('categories', 'monthly_budget')
    op.drop_column('categories', 'category_type')
