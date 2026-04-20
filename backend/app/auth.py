"""
Auth service layer — registration, login, token refresh, logout.
All public surfaces return generic messages to prevent user enumeration.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    password_needs_rehash,
    verify_password,
)
from app.models import RefreshToken, User
from app.schemas.user import UserRegisterIn, TokenPair


_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)

_ACCOUNT_LOCKED = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Account temporarily locked. Try again later.",
)


async def register(db: AsyncSession, payload: UserRegisterIn) -> TokenPair:
    existing = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        # Same response as success — prevents email enumeration
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()  # get user.id before seeding categories

    await _seed_default_categories(db, user.id)
    await _create_welcome_notification(db, user.id)

    raw_rt, rt_hash = create_refresh_token()
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=rt_hash,
        expires_at=datetime.now(tz=timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))

    await db.commit()

    access_token = create_access_token(user.id)

    import asyncio
    from app import email as mail_service
    asyncio.ensure_future(mail_service.send_welcome(user.email, user.name))

    return TokenPair(access_token=access_token, refresh_token=raw_rt, token_type="bearer")


async def login(db: AsyncSession, email: str, password: str) -> TokenPair:
    user: User | None = await db.scalar(select(User).where(User.email == email.lower()))

    # Always run verify_password to prevent timing attacks on user existence
    candidate_hash = user.hashed_password if user else "$argon2id$dummy"
    password_ok = verify_password(password, candidate_hash)

    if user is None or not password_ok:
        if user:
            await _handle_failed_login(db, user)
        raise _INVALID_CREDENTIALS

    if not user.is_active:
        raise _INVALID_CREDENTIALS

    if user.locked_until and user.locked_until > datetime.now(tz=timezone.utc):
        raise _ACCOUNT_LOCKED

    # Reset failure counter on success
    user.failed_logins = 0
    user.locked_until = None

    # Rehash if Argon2 parameters changed
    if password_needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(password)

    raw_rt, rt_hash = create_refresh_token()
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=rt_hash,
        expires_at=datetime.now(tz=timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))

    await db.commit()

    access_token = create_access_token(user.id)
    return TokenPair(access_token=access_token, refresh_token=raw_rt, token_type="bearer")


async def refresh(db: AsyncSession, raw_refresh_token: str) -> TokenPair:
    token_hash = hash_refresh_token(raw_refresh_token)
    now = datetime.now(tz=timezone.utc)

    rt: RefreshToken | None = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
            RefreshToken.expires_at > now,
        )
    )
    if rt is None:
        raise _INVALID_CREDENTIALS

    # Rotate: revoke old, issue new
    rt.revoked = True

    new_raw, new_hash = create_refresh_token()
    db.add(RefreshToken(
        user_id=rt.user_id,
        token_hash=new_hash,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))

    await db.commit()

    access_token = create_access_token(rt.user_id)
    return TokenPair(access_token=access_token, refresh_token=new_raw, token_type="bearer")


async def logout(db: AsyncSession, raw_refresh_token: str) -> None:
    token_hash = hash_refresh_token(raw_refresh_token)
    rt: RefreshToken | None = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    if rt:
        rt.revoked = True
        await db.commit()


async def _handle_failed_login(db: AsyncSession, user: User) -> None:
    user.failed_logins = (user.failed_logins or 0) + 1
    if user.failed_logins >= settings.MAX_FAILED_LOGINS:
        user.locked_until = datetime.now(tz=timezone.utc) + timedelta(minutes=settings.LOCKOUT_MINUTES)
    await db.commit()


_DEFAULT_CATEGORIES = [
    ("Alimentación", "#FF6B6B", "utensils"),
    ("Transporte", "#4ECDC4", "car"),
    ("Vivienda", "#45B7D1", "home"),
    ("Salud", "#96CEB4", "heart"),
    ("Entretenimiento", "#FFEAA7", "star"),
    ("Educación", "#DDA0DD", "book"),
    ("Ropa", "#98D8C8", "shirt"),
    ("Tecnología", "#74B9FF", "cpu"),
    ("Ahorro", "#55EFC4", "piggy-bank"),
    ("Otros", "#B2BEC3", "circle"),
]


async def _seed_default_categories(db: AsyncSession, user_id: uuid.UUID) -> None:
    from app.models import Category

    for name, color, icon in _DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_id, name=name, color=color, icon=icon, is_system=True))


async def _create_welcome_notification(db: AsyncSession, user_id: uuid.UUID) -> None:
    from app.models import Notification, NotificationType

    db.add(Notification(
        user_id=user_id,
        title="¡Bienvenido a CashFlow!",
        body="Tu cuenta está lista. Empieza registrando tus cuentas y transacciones para ver tu resumen financiero.",
        type=NotificationType.welcome,
    ))
