from __future__ import annotations

import uuid
from decimal import Decimal

from pydantic import BaseModel

from app.models import AccountType, CurrencyCode
from app.schemas.transaction import TransactionOut


class AccountSummary(BaseModel):
    id: uuid.UUID
    name: str
    account_type: AccountType
    currency: CurrencyCode
    balance: Decimal


class MonthSummary(BaseModel):
    income: Decimal
    expense: Decimal
    net: Decimal


class CategorySummary(BaseModel):
    category_id: uuid.UUID | None
    category_name: str
    total: Decimal
    count: int


class DashboardOut(BaseModel):
    total_balance: Decimal
    accounts: list[AccountSummary]
    current_month: MonthSummary
    top_categories: list[CategorySummary]
    recent_transactions: list[TransactionOut]
