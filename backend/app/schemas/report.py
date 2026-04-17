from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel


class DistributionItem(BaseModel):
    category_id: str | None
    category_name: str
    amount: Decimal
    percentage: float
    color: str
    count: int


class TrendItem(BaseModel):
    period: str       # "YYYY-MM"
    income: Decimal
    expense: Decimal
    net: Decimal
