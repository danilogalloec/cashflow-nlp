from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models import Budget, Category, User
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(Category)
        .where(Category.user_id == current_user.id)
        .order_by(Category.name)
    )
    return rows.all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(Category).where(
            Category.user_id == current_user.id,
            Category.name == payload.name,
        )
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una categoría con ese nombre.")

    cat = Category(user_id=current_user.id, **payload.model_dump())
    db.add(cat)
    await db.flush()

    if payload.monthly_budget and payload.monthly_budget > 0:
        db.add(Budget(
            user_id=current_user.id,
            category_id=cat.id,
            name=cat.name,
            amount=payload.monthly_budget,
        ))

    await db.commit()
    await db.refresh(cat)
    return cat


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cat = await _get_or_404(db, category_id, current_user.id)
    for attr, value in payload.model_dump(exclude_none=True).items():
        setattr(cat, attr, value)

    if payload.monthly_budget is not None:
        budget = await db.scalar(
            select(Budget).where(
                Budget.user_id == current_user.id,
                Budget.category_id == cat.id,
            )
        )
        if payload.monthly_budget > 0:
            if budget:
                budget.amount = payload.monthly_budget
                budget.name = payload.name or cat.name
            else:
                db.add(Budget(
                    user_id=current_user.id,
                    category_id=cat.id,
                    name=cat.name,
                    amount=payload.monthly_budget,
                ))
        elif budget:
            await db.delete(budget)

    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cat = await _get_or_404(db, category_id, current_user.id)
    if cat.is_system:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No se pueden eliminar categorías del sistema.")
    await db.delete(cat)
    await db.commit()


async def _get_or_404(db: AsyncSession, cat_id: uuid.UUID, user_id: uuid.UUID) -> Category:
    cat = await db.scalar(
        select(Category).where(Category.id == cat_id, Category.user_id == user_id)
    )
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada.")
    return cat
