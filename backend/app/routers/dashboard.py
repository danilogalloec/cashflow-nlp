"""
Dashboard endpoint — 4 targeted queries, zero N+1.
Returns full month summary + per-account balances + top categories + recent transactions.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models import Account, Category, Transaction, TransactionDirection, TransactionStatus, User
from app.schemas.dashboard import AccountSummary, CategorySummary, DashboardOut, MonthSummary
from app.schemas.transaction import TransactionOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_ZERO = Decimal("0")


@router.get("", response_model=DashboardOut)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(tz=timezone.utc)
    uid = current_user.id

    # 1 ── Account balances
    accounts = (await db.scalars(
        select(Account)
        .where(Account.user_id == uid, Account.is_active.is_(True))
        .order_by(Account.account_type, Account.name)
    )).all()

    total_balance = sum((a.balance for a in accounts), _ZERO)

    # 2 ── Current-month income / expense aggregate (single query)
    monthly_row = (await db.execute(
        select(
            func.coalesce(
                func.sum(case((Transaction.direction == TransactionDirection.income, Transaction.amount), else_=_ZERO)),
                _ZERO,
            ).label("income"),
            func.coalesce(
                func.sum(case((Transaction.direction == TransactionDirection.expense, Transaction.amount), else_=_ZERO)),
                _ZERO,
            ).label("expense"),
        ).where(
            Transaction.user_id == uid,
            Transaction.status == TransactionStatus.completed,
            extract("year", Transaction.transaction_date) == now.year,
            extract("month", Transaction.transaction_date) == now.month,
        )
    )).one()

    income = monthly_row.income or _ZERO
    expense = monthly_row.expense or _ZERO

    # 3 ── Top 5 expense categories this month
    cat_rows = (await db.execute(
        select(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == uid,
            Transaction.direction == TransactionDirection.expense,
            Transaction.status == TransactionStatus.completed,
            extract("year", Transaction.transaction_date) == now.year,
            extract("month", Transaction.transaction_date) == now.month,
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
    )).all()

    # 4 ── Last 10 transactions (with eager-loaded relations)
    recent = (await db.scalars(
        select(Transaction)
        .where(Transaction.user_id == uid)
        .options(
            selectinload(Transaction.account),
            selectinload(Transaction.category),
        )
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(10)
    )).all()

    return DashboardOut(
        total_balance=total_balance,
        accounts=[
            AccountSummary(
                id=a.id, name=a.name,
                account_type=a.account_type, currency=a.currency, balance=a.balance,
            )
            for a in accounts
        ],
        current_month=MonthSummary(income=income, expense=expense, net=income - expense),
        top_categories=[
            CategorySummary(
                category_id=row.category_id,
                category_name=row.category_name,
                total=row.total,
                count=row.count,
            )
            for row in cat_rows
        ],
        recent_transactions=[TransactionOut.model_validate(tx) for tx in recent],
    )
