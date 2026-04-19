from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models import CurrencyCode, IncomeFrequency


class SubscriptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    currency: CurrencyCode = CurrencyCode.USD
    frequency: IncomeFrequency = IncomeFrequency.monthly
    next_due: date | None = None
    end_date: date | None = None
    category_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def strip(cls, v: str) -> str:
        return v.strip()


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    amount: Decimal | None = Field(default=None, gt=0)
    frequency: IncomeFrequency | None = None
    next_due: date | None = None
    end_date: date | None = None
    category_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    is_active: bool | None = None
    notes: str | None = None


class SubscriptionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    amount: Decimal
    currency: CurrencyCode
    frequency: IncomeFrequency
    next_due: date | None
    end_date: date | None
    category_id: uuid.UUID | None
    account_id: uuid.UUID | None
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime
