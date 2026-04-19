from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models import Budget, Category, Transaction, TransactionDirection, TransactionStatus, User
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate, BudgetUsage

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetOut])
async def list_budgets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(Budget)
        .where(Budget.user_id == current_user.id)
        .order_by(Budget.name)
    )
    return rows.all()


@router.get("/usage", response_model=list[BudgetUsage])
async def get_budget_usage(
    year: int | None = Query(None),
    month: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(tz=timezone.utc)
    y = year or now.year
    m = month or now.month

    budgets = (await db.scalars(
        select(Budget)
        .where(Budget.user_id == current_user.id, Budget.is_active.is_(True))
    )).all()

    if not budgets:
        return []

    cat_ids = [b.category_id for b in budgets if b.category_id]
    cats: dict[uuid.UUID, Category] = {}
    if cat_ids:
        cat_rows = (await db.scalars(
            select(Category).where(Category.id.in_(cat_ids))
        )).all()
        cats = {c.id: c for c in cat_rows}

    spent_rows = (await db.execute(
        select(
            Transaction.category_id,
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            Transaction.user_id == current_user.id,
            Transaction.direction == TransactionDirection.expense,
            Transaction.status == TransactionStatus.completed,
            extract("year", Transaction.transaction_date) == y,
            extract("month", Transaction.transaction_date) == m,
        )
        .group_by(Transaction.category_id)
    )).all()
    spent_map: dict[uuid.UUID | None, Decimal] = {row.category_id: row.total for row in spent_rows}

    result = []
    for b in budgets:
        spent = spent_map.get(b.category_id, Decimal("0"))
        cat = cats.get(b.category_id) if b.category_id else None
        result.append(BudgetUsage(
            budget_id=b.id,
            name=b.name,
            category_id=b.category_id,
            category_name=cat.name if cat else None,
            category_color=cat.color if cat else None,
            limit=b.amount,
            spent=spent,
            percentage=float(spent / b.amount * 100) if b.amount > 0 else 0.0,
        ))
    return result


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
async def create_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    budget = Budget(user_id=current_user.id, **payload.model_dump())
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.patch("/{budget_id}", response_model=BudgetOut)
async def update_budget(
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    budget = await _get_or_404(db, budget_id, current_user.id)
    for attr, value in payload.model_dump(exclude_none=True).items():
        setattr(budget, attr, value)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    budget = await _get_or_404(db, budget_id, current_user.id)
    await db.delete(budget)
    await db.commit()


async def _get_or_404(db: AsyncSession, budget_id: uuid.UUID, user_id: uuid.UUID) -> Budget:
    budget = await db.scalar(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    if not budget:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Presupuesto no encontrado.")
    return budget
