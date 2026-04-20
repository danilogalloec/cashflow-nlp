from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models import Account, Budget, Subscription, Transaction, User
from app.schemas.user import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Admin gate ────────────────────────────────────────────────────────────────

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado.")
    return current_user


# ── Schemas ───────────────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    email: str
    is_active: bool
    is_admin: bool
    is_verified: bool
    failed_logins: int
    locked_until: datetime | None
    created_at: datetime


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_transactions: int
    total_accounts: int
    total_subscriptions: int
    total_budgets: int
    new_users_this_month: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(tz=timezone.utc)

    total_users = await db.scalar(select(func.count(User.id))) or 0
    active_users = await db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    total_transactions = await db.scalar(select(func.count(Transaction.id))) or 0
    total_accounts = await db.scalar(select(func.count(Account.id))) or 0
    total_subscriptions = await db.scalar(select(func.count(Subscription.id)).where(Subscription.is_active.is_(True))) or 0
    total_budgets = await db.scalar(select(func.count(Budget.id)).where(Budget.is_active.is_(True))) or 0
    new_this_month = await db.scalar(
        select(func.count(User.id)).where(
            func.extract("year", User.created_at) == now.year,
            func.extract("month", User.created_at) == now.month,
        )
    ) or 0

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_transactions=total_transactions,
        total_accounts=total_accounts,
        total_subscriptions=total_subscriptions,
        total_budgets=total_budgets,
        new_users_this_month=new_this_month,
    )


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(User).order_by(User.created_at.desc())
    )
    return rows.all()


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes modificar tu propio rol de administrador.")
    user = await _get_user_or_404(db, user_id)
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes eliminar tu propia cuenta.")
    user = await _get_user_or_404(db, user_id)
    await db.delete(user)
    await db.commit()


async def _get_user_or_404(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")
    return user
