from __future__ import annotations

import csv
import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models import Account, AccountType, Category, Transaction, TransactionDirection, User
from app.nlp import parser as nlp_parser
from app.schemas.transaction import (
    NLPParseIn,
    NLPParseOut,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)
from app.services import transaction_service as svc

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/export")
async def export_transactions(
    account_id: uuid.UUID | None = None,
    direction: TransactionDirection | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    search: str | None = Query(None, max_length=200),
    category_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .options(selectinload(Transaction.category), selectinload(Transaction.account))
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
    )
    if account_id:
        q = q.where(Transaction.account_id == account_id)
    if direction:
        q = q.where(Transaction.direction == direction)
    if from_date:
        q = q.where(Transaction.transaction_date >= from_date)
    if to_date:
        q = q.where(Transaction.transaction_date <= to_date)
    if search:
        q = q.where(Transaction.description.ilike(f"%{search}%"))
    if category_id:
        q = q.where(Transaction.category_id == category_id)

    transactions = (await db.scalars(q)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Fecha", "Descripción", "Categoría", "Tipo", "Cuenta", "Monto", "Moneda", "Estado"])
    for tx in transactions:
        writer.writerow([
            tx.transaction_date,
            tx.description or "",
            tx.category.name if tx.category else "",
            tx.direction,
            tx.account.name if tx.account else "",
            tx.amount,
            tx.currency,
            tx.status,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=transacciones.csv"},
    )


@router.get("", response_model=list[TransactionOut])
async def list_transactions(
    account_id: uuid.UUID | None = None,
    direction: TransactionDirection | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    search: str | None = Query(None, max_length=200),
    category_id: uuid.UUID | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .options(selectinload(Transaction.category))
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if account_id:
        q = q.where(Transaction.account_id == account_id)
    if direction:
        q = q.where(Transaction.direction == direction)
    if from_date:
        q = q.where(Transaction.transaction_date >= from_date)
    if to_date:
        q = q.where(Transaction.transaction_date <= to_date)
    if search:
        q = q.where(Transaction.description.ilike(f"%{search}%"))
    if category_id:
        q = q.where(Transaction.category_id == category_id)

    return (await db.scalars(q)).all()


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.create(db, current_user, payload)


@router.post("/parse", response_model=NLPParseOut)
async def parse_natural_language(
    payload: NLPParseIn,
    execute: bool = Query(False, description="Auto-create transaction when confidence >= 0.7"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = nlp_parser.parse(payload.text)

    created_tx = None
    if execute and result.confidence >= 0.7 and result.amount and result.direction:
        account = await _resolve_account(db, current_user.id, result.account_type_hint)
        to_account = None
        if result.direction == TransactionDirection.transfer:
            to_account = await _resolve_account(db, current_user.id, result.to_account_type_hint)

        category_id = await _resolve_category(db, current_user.id, result.category_hint)

        tx_payload = TransactionCreate(
            account_id=account.id,
            to_account_id=to_account.id if to_account else None,
            direction=result.direction,
            amount=result.amount,
            currency=result.currency,
            description=result.description,
            category_id=category_id,
            transaction_date=result.transaction_date or date.today(),
            input_method="text_nlp",
            raw_input=payload.text,
        )
        created_tx = await svc.create(db, current_user, tx_payload)

    return NLPParseOut(
        understood=result.confidence >= 0.5,
        direction=result.direction,
        amount=result.amount,
        currency=result.currency,
        description=result.description,
        category_hint=result.category_hint,
        account_type_hint=result.account_type_hint,
        to_account_type_hint=result.to_account_type_hint,
        transaction_date=result.transaction_date,
        confidence=result.confidence,
        raw_text=result.raw_text,
        transaction=TransactionOut.model_validate(created_tx) if created_tx else None,
    )


@router.get("/{transaction_id}", response_model=TransactionOut)
async def get_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_or_404(db, current_user, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.update(db, current_user, transaction_id, payload)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete(db, current_user, transaction_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _resolve_account(db: AsyncSession, user_id: uuid.UUID, type_hint: str | None) -> Account:
    q = select(Account).where(Account.user_id == user_id, Account.is_active.is_(True))
    if type_hint:
        try:
            atype = AccountType(type_hint)
            q = q.where(Account.account_type == atype)
        except ValueError:
            pass
    account = await db.scalar(q.order_by(Account.created_at).limit(1))
    if not account:
        from fastapi import HTTPException
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No active account found for this user.")
    return account


async def _resolve_category(db: AsyncSession, user_id: uuid.UUID, hint: str | None) -> uuid.UUID | None:
    if not hint:
        return None
    cat = await db.scalar(
        select(Category).where(Category.user_id == user_id, Category.name == hint)
    )
    return cat.id if cat else None
