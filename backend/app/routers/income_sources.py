from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models import IncomeSource, User
from app.schemas.income import IncomeSourceCreate, IncomeSourceOut, IncomeSourceUpdate

router = APIRouter(prefix="/income-sources", tags=["income"])


@router.get("", response_model=list[IncomeSourceOut])
async def list_income_sources(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(IncomeSource)
        .where(IncomeSource.user_id == current_user.id)
        .order_by(IncomeSource.next_expected.asc().nulls_last(), IncomeSource.name)
    )
    return rows.all()


@router.post("", response_model=IncomeSourceOut, status_code=status.HTTP_201_CREATED)
async def create_income_source(
    payload: IncomeSourceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    source = IncomeSource(user_id=current_user.id, **payload.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.get("/{source_id}", response_model=IncomeSourceOut)
async def get_income_source(
    source_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_or_404(db, source_id, current_user.id)


@router.patch("/{source_id}", response_model=IncomeSourceOut)
async def update_income_source(
    source_id: uuid.UUID,
    payload: IncomeSourceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    source = await _get_or_404(db, source_id, current_user.id)
    for attr, value in payload.model_dump(exclude_none=True).items():
        setattr(source, attr, value)
    await db.commit()
    await db.refresh(source)
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income_source(
    source_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    source = await _get_or_404(db, source_id, current_user.id)
    source.is_active = False   # soft-delete; preserves linked transactions
    await db.commit()


async def _get_or_404(db: AsyncSession, source_id: uuid.UUID, user_id: uuid.UUID) -> IncomeSource:
    source = await db.scalar(
        select(IncomeSource).where(
            IncomeSource.id == source_id,
            IncomeSource.user_id == user_id,
        )
    )
    if not source:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Income source not found.")
    return source
