from __future__ import annotations

import uuid
from calendar import monthrange
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models import Account, IncomeFrequency, Subscription, User
from app.schemas.subscription import SubscriptionCreate, SubscriptionOut, SubscriptionUpdate
from app.schemas.transaction import TransactionCreate, TransactionOut
from app.services import transaction_service as svc

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def _advance_date(d: date, freq: IncomeFrequency) -> date:
    if freq == IncomeFrequency.monthly:
        month = d.month + 1
        year = d.year
        if month > 12:
            month = 1
            year += 1
        day = min(d.day, monthrange(year, month)[1])
        return d.replace(year=year, month=month, day=day)
    if freq == IncomeFrequency.annual:
        return d.replace(year=d.year + 1)
    if freq == IncomeFrequency.weekly:
        return d + timedelta(weeks=1)
    if freq == IncomeFrequency.biweekly:
        return d + timedelta(weeks=2)
    if freq == IncomeFrequency.daily:
        return d + timedelta(days=1)
    return d


@router.get("/upcoming", response_model=list[SubscriptionOut])
async def upcoming_subscriptions(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    limit_date = today + timedelta(days=days)
    rows = await db.scalars(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.is_active.is_(True),
            Subscription.next_due >= today,
            Subscription.next_due <= limit_date,
        ).order_by(Subscription.next_due)
    )
    return rows.all()


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


@router.post("/{sub_id}/pay", response_model=TransactionOut)
async def pay_subscription(
    sub_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await _get_or_404(db, sub_id, current_user.id)

    account_id = sub.account_id
    if not account_id:
        account = await db.scalar(
            select(Account)
            .where(Account.user_id == current_user.id, Account.is_active.is_(True))
            .order_by(Account.created_at)
        )
        if not account:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No hay cuenta activa.")
        account_id = account.id

    tx_payload = TransactionCreate(
        account_id=account_id,
        direction="expense",
        amount=sub.amount,
        currency=sub.currency,
        description=f"Pago: {sub.name}",
        category_id=sub.category_id,
        subscription_id=sub.id,
        input_method="manual",
    )
    tx = await svc.create(db, current_user, tx_payload)

    if sub.next_due and sub.frequency != IncomeFrequency.once:
        sub.next_due = _advance_date(sub.next_due, sub.frequency)
        await db.commit()

    return tx


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
