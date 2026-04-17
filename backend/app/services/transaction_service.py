"""
Atomic transaction service.
Balance mutations always happen inside a single DB transaction with SELECT FOR UPDATE,
so concurrent requests on the same account are serialised at the row level — no double-spending.
"""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Account, Transaction, TransactionDirection, TransactionStatus, User
from app.schemas.transaction import TransactionCreate, TransactionUpdate


async def get_or_404(db: AsyncSession, user: User, tx_id: uuid.UUID) -> Transaction:
    tx = await db.scalar(
        select(Transaction)
        .where(Transaction.id == tx_id, Transaction.user_id == user.id)
        .options(selectinload(Transaction.account), selectinload(Transaction.category))
    )
    if not tx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found.")
    return tx


async def _lock_account(db: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID) -> Account:
    account = await db.scalar(
        select(Account)
        .where(Account.id == account_id, Account.user_id == user_id, Account.is_active.is_(True))
        .with_for_update()
    )
    if not account:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Account {account_id} not found.")
    return account


async def create(db: AsyncSession, user: User, payload: TransactionCreate) -> Transaction:
    if payload.direction == TransactionDirection.transfer:
        return await _create_transfer(db, user, payload)
    return await _create_simple(db, user, payload)


async def _create_simple(db: AsyncSession, user: User, payload: TransactionCreate) -> Transaction:
    account = await _lock_account(db, payload.account_id, user.id)

    if payload.direction == TransactionDirection.income:
        account.balance += payload.amount
    else:
        account.balance -= payload.amount

    tx = _build_tx(user.id, payload)
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


async def _create_transfer(db: AsyncSession, user: User, payload: TransactionCreate) -> Transaction:
    # Lock in deterministic UUID order to eliminate deadlock potential
    ids_sorted = sorted([payload.account_id, payload.to_account_id], key=str)  # type: ignore[arg-type]
    rows = (await db.scalars(
        select(Account)
        .where(Account.id.in_(ids_sorted), Account.user_id == user.id, Account.is_active.is_(True))
        .order_by(Account.id)
        .with_for_update()
    )).all()

    if len(rows) != 2:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "One or both accounts not found.")

    accounts = {a.id: a for a in rows}
    src = accounts[payload.account_id]
    dst = accounts[payload.to_account_id]  # type: ignore[index]

    if src.balance < payload.amount:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Insufficient balance for transfer.")

    src.balance -= payload.amount
    dst.balance += payload.amount

    tx = _build_tx(user.id, payload)
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


async def update(db: AsyncSession, user: User, tx_id: uuid.UUID, payload: TransactionUpdate) -> Transaction:
    tx = await get_or_404(db, user, tx_id)
    for attr, value in payload.model_dump(exclude_none=True).items():
        setattr(tx, attr, value)
    await db.commit()
    await db.refresh(tx)
    return tx


async def delete(db: AsyncSession, user: User, tx_id: uuid.UUID) -> None:
    """Deletes transaction and reverses its balance effect atomically."""
    tx = await db.scalar(
        select(Transaction)
        .where(Transaction.id == tx_id, Transaction.user_id == user.id)
        .with_for_update()
    )
    if not tx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found.")

    if tx.direction == TransactionDirection.transfer:
        src = await _lock_account(db, tx.account_id, user.id)
        dst = await _lock_account(db, tx.to_account_id, user.id)  # type: ignore[arg-type]
        src.balance += tx.amount
        dst.balance -= tx.amount
    elif tx.direction == TransactionDirection.income:
        account = await _lock_account(db, tx.account_id, user.id)
        account.balance -= tx.amount
    else:
        account = await _lock_account(db, tx.account_id, user.id)
        account.balance += tx.amount

    await db.delete(tx)
    await db.commit()


def _build_tx(user_id: uuid.UUID, payload: TransactionCreate) -> Transaction:
    return Transaction(
        user_id=user_id,
        account_id=payload.account_id,
        to_account_id=payload.to_account_id,
        direction=payload.direction,
        amount=payload.amount,
        currency=payload.currency,
        description=payload.description,
        notes=payload.notes,
        category_id=payload.category_id,
        income_source_id=payload.income_source_id,
        subscription_id=payload.subscription_id,
        transaction_date=payload.transaction_date,
        status=TransactionStatus.completed,
        input_method=payload.input_method,
        raw_input=payload.raw_input,
    )
