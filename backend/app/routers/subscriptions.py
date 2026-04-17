from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models import Subscription, User
from app.schemas.subscription import SubscriptionCreate, SubscriptionOut, SubscriptionUpdate

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("", response_model=list[SubscriptionOut])
async def list_subscriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
        .order_by(Subscription.next_due.asc().nulls_last(), Subscription.name)
    )
    return rows.all()


@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = Subscription(user_id=current_user.id, **payload.model_dump())
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


@router.patch("/{sub_id}", response_model=SubscriptionOut)
async def update_subscription(
    sub_id: uuid.UUID,
    payload: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await _get_or_404(db, sub_id, current_user.id)
    for attr, value in payload.model_dump(exclude_none=True).items():
        setattr(sub, attr, value)
    await db.commit()
    await db.refresh(sub)
    return sub


@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription(
    sub_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await _get_or_404(db, sub_id, current_user.id)
    sub.is_active = False
    await db.commit()


async def _get_or_404(db: AsyncSession, sub_id: uuid.UUID, user_id: uuid.UUID) -> Subscription:
    sub = await db.scalar(
        select(Subscription).where(
            Subscription.id == sub_id,
            Subscription.user_id == user_id,
        )
    )
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suscripción no encontrada.")
    return sub
