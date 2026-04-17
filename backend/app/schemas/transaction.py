from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models import (
    CurrencyCode,
    InputMethod,
    TransactionDirection,
    TransactionStatus,
)


class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    direction: TransactionDirection
    amount: Decimal = Field(gt=0, max_digits=18, decimal_places=8)
    currency: CurrencyCode = CurrencyCode.USD
    description: str | None = Field(default=None, max_length=500)
    notes: str | None = None
    category_id: uuid.UUID | None = None
    income_source_id: uuid.UUID | None = None
    subscription_id: uuid.UUID | None = None
    to_account_id: uuid.UUID | None = None
    transaction_date: date = Field(default_factory=date.today)
    input_method: InputMethod = InputMethod.manual
    raw_input: str | None = None

    @model_validator(mode="after")
    def transfer_requires_target(self) -> TransactionCreate:
        if self.direction == TransactionDirection.transfer and not self.to_account_id:
            raise ValueError("to_account_id is required for transfers.")
        if self.to_account_id and self.to_account_id == self.account_id:
            raise ValueError("Source and destination accounts must differ.")
        return self


class TransactionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    account_id: uuid.UUID
    to_account_id: uuid.UUID | None
    category_id: uuid.UUID | None
    income_source_id: uuid.UUID | None
    subscription_id: uuid.UUID | None
    direction: TransactionDirection
    amount: Decimal
    currency: CurrencyCode
    description: str | None
    status: TransactionStatus
    input_method: InputMethod
    transaction_date: date
    created_at: datetime


class TransactionUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=500)
    notes: str | None = None
    category_id: uuid.UUID | None = None
    subscription_id: uuid.UUID | None = None
    transaction_date: date | None = None


class NLPParseIn(BaseModel):
    text: str = Field(min_length=2, max_length=500)


@dataclass
class ParseResult:
    direction: TransactionDirection | None = None
    amount: Decimal | None = None
    currency: CurrencyCode = CurrencyCode.USD
    description: str | None = None
    category_hint: str | None = None
    account_type_hint: str | None = None
    to_account_type_hint: str | None = None
    transaction_date: date | None = None
    confidence: float = 0.0
    raw_text: str = ""


class NLPParseOut(BaseModel):
    understood: bool
    direction: TransactionDirection | None
    amount: Decimal | None
    currency: CurrencyCode
    description: str | None
    category_hint: str | None
    account_type_hint: str | None
    to_account_type_hint: str | None
    transaction_date: date | None
    confidence: float
    raw_text: str
    transaction: TransactionOut | None = None
