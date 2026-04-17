from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models import Account, Transaction, User
from app.schemas.account import AccountCreate, AccountOut, AccountUpdate

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountOut])
async def list_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(Account)
        .where(Account.user_id == current_user.id)
        .order_by(Account.account_type, Account.name)
    )
    return rows.all()


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    payload: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = Account(
        user_id=current_user.id,
        name=payload.name,
        account_type=payload.account_type,
        currency=payload.currency,
        balance=payload.initial_balance,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.get("/{account_id}", response_model=AccountOut)
async def get_account(
    account_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await _get_or_404(db, account_id, current_user.id)
    return account


@router.patch("/{account_id}", response_model=AccountOut)
async def update_account(
    account_id: uuid.UUID,
    payload: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await _get_or_404(db, account_id, current_user.id)
    for attr, value in payload.model_dump(exclude_none=True).items():
        setattr(account, attr, value)
    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await _get_or_404(db, account_id, current_user.id)

    has_tx = await db.scalar(
        select(Transaction.id).where(Transaction.account_id == account_id).limit(1)
    )
    if has_tx:
        # Soft-delete to preserve audit trail
        account.is_active = False
        await db.commit()
    else:
        await db.delete(account)
        await db.commit()


async def _get_or_404(db: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID) -> Account:
    account = await db.scalar(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    if not account:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found.")
    return account
