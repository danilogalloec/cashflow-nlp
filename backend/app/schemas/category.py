from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

CategoryType = Literal['expense', 'income', 'both']


class CategoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    color: str | None
    icon: str | None
    is_system: bool
    category_type: str
    monthly_budget: Decimal | None


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str | None = Field(default=None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: str | None = Field(default=None, max_length=40)
    category_type: CategoryType = 'expense'
    monthly_budget: Decimal | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(default=None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: str | None = Field(default=None, max_length=40)
    category_type: CategoryType | None = None
    monthly_budget: Decimal | None = None
