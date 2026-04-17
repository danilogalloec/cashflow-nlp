"""
Reports router — aggregations for pie charts and trend lines.
All queries are single-pass aggregates; no Python-side loops.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, extract, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models import Category, IncomeFrequency, IncomeSource, Subscription, Transaction, TransactionDirection, TransactionStatus, User
from app.schemas.report import DistributionItem, TrendItem

_FREQ_MULT: dict[IncomeFrequency, Decimal] = {
    IncomeFrequency.monthly:  Decimal("1"),
    IncomeFrequency.annual:   Decimal("0.083333"),
    IncomeFrequency.weekly:   Decimal("4.33"),
    IncomeFrequency.biweekly: Decimal("2.17"),
    IncomeFrequency.daily:    Decimal("30"),
    IncomeFrequency.once:     Decimal("0"),
}

router = APIRouter(prefix="/reports", tags=["reports"])

_FALLBACK_COLOR = "#6B7280"
_ZERO = Decimal("0")


@router.get("/distribution", response_model=list[DistributionItem])
async def get_distribution(
    year: int | None = None,
    month: int | None = None,
    direction: TransactionDirection = TransactionDirection.expense,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Expense (or income) distribution by category for a given month.
    Defaults to the current calendar month.
    """
    now = datetime.now(tz=timezone.utc)
    y = year or now.year
    m = month or now.month

    rows = (await db.execute(
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.coalesce(Category.color, _FALLBACK_COLOR).label("color"),
            func.sum(Transaction.amount).label("amount"),
            func.count(Transaction.id).label("count"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == current_user.id,
            Transaction.direction == direction,
            Transaction.status == TransactionStatus.completed,
            extract("year", Transaction.transaction_date) == y,
            extract("month", Transaction.transaction_date) == m,
        )
        .group_by(Category.id, Category.name, Category.color)
        .order_by(func.sum(Transaction.amount).desc())
    )).all()

    if not rows:
        return []

    total = sum(r.amount for r in rows)
    return [
        DistributionItem(
            category_id=str(r.category_id),
            category_name=r.category_name,
            amount=r.amount,
            percentage=round(float(r.amount / total) * 100, 2) if total else 0.0,
            color=r.color,
            count=r.count,
        )
        for r in rows
    ]


@router.get("/trends", response_model=list[TrendItem])
async def get_trends(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Monthly income / expense / net for the last N months.
    Uses a single GROUP BY on date_trunc — no N+1.
    """
    now = datetime.now(tz=timezone.utc)

    # Compute the first day of the earliest month we want
    target_month = now.month - (months - 1)
    target_year = now.year
    while target_month <= 0:
        target_month += 12
        target_year -= 1
    cutoff = date(target_year, target_month, 1)

    tx_rows = (await db.execute(
        select(
            func.to_char(
                func.date_trunc("month", Transaction.transaction_date),
                "YYYY-MM",
            ).label("period"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.direction == TransactionDirection.income, Transaction.amount),
                        else_=_ZERO,
                    )
                ),
                _ZERO,
            ).label("income"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.direction == TransactionDirection.expense, Transaction.amount),
                        else_=_ZERO,
                    )
                ),
                _ZERO,
            ).label("expense"),
        )
        .where(
            Transaction.user_id == current_user.id,
            Transaction.status == TransactionStatus.completed,
            Transaction.transaction_date >= cutoff,
        )
        .group_by(text("period"))
        .order_by(text("period"))
    )).all()

    # Fixed monthly income from active income sources
    income_sources = (await db.scalars(
        select(IncomeSource).where(
            IncomeSource.user_id == current_user.id,
            IncomeSource.is_active.is_(True),
        )
    )).all()
    fixed_monthly_income = sum(
        (s.amount * _FREQ_MULT.get(s.frequency, Decimal("1")) for s in income_sources),
        _ZERO,
    )

    # Fixed monthly expense from active subscriptions
    subs = (await db.scalars(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.is_active.is_(True),
        )
    )).all()
    fixed_monthly_expense = sum(
        (s.amount * _FREQ_MULT.get(s.frequency, Decimal("1")) for s in subs),
        _ZERO,
    )

    # Index transaction data by period
    tx_by_period = {r.period: r for r in tx_rows}

    # Emit every month in the range so gaps don't disappear from the chart
    result: list[TrendItem] = []
    y, m = target_year, target_month
    while (y, m) <= (now.year, now.month):
        period = f"{y:04d}-{m:02d}"
        tx = tx_by_period.get(period)
        tx_income  = (tx.income  or _ZERO) if tx else _ZERO
        tx_expense = (tx.expense or _ZERO) if tx else _ZERO
        income  = tx_income  + fixed_monthly_income
        expense = tx_expense + fixed_monthly_expense
        result.append(TrendItem(
            period=period,
            income=income,
            expense=expense,
            net=income - expense,
        ))
        m += 1
        if m > 12:
            m = 1
            y += 1

    return result
