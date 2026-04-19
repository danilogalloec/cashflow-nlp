from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    category_id: uuid.UUID | None = None


class BudgetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    amount: Decimal | None = Field(default=None, gt=0)
    category_id: uuid.UUID | None = None
    is_active: bool | None = None


class BudgetOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    amount: Decimal
    category_id: uuid.UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BudgetUsage(BaseModel):
    budget_id: uuid.UUID
    name: str
    category_id: uuid.UUID | None
    category_name: str | None
    category_color: str | None
    limit: Decimal
    spent: Decimal
    percentage: float
