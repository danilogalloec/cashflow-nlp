from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models import AccountType, CurrencyCode


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    account_type: AccountType
    currency: CurrencyCode = CurrencyCode.USD
    initial_balance: Decimal = Field(default=Decimal("0"), ge=0)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    balance: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None


class AccountOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    account_type: AccountType
    currency: CurrencyCode
    balance: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
