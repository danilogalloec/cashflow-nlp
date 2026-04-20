import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app import auth as auth_service
from app import email as mail
from app.core.config import settings
from app.core.security import create_refresh_token, hash_password, hash_refresh_token, verify_password
from app.dependencies import get_db, get_current_user
from app.models import PasswordResetToken, User
from app.schemas.user import ForgotPasswordIn, RefreshIn, ResetPasswordIn, TokenPair, UserLoginIn, UserOut, UserRegisterIn, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=TokenPair, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, payload: UserRegisterIn, db: AsyncSession = Depends(get_db)):
    return await auth_service.register(db, payload)


@router.post("/login", response_model=TokenPair)
@limiter.limit("5/minute")
async def login(request: Request, payload: UserLoginIn, db: AsyncSession = Depends(get_db)):
    return await auth_service.login(db, payload.email, payload.password)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshIn, db: AsyncSession = Depends(get_db)):
    return await auth_service.refresh(db, payload.refresh_token)


@router.post("/logout", status_code=204)
async def logout(payload: RefreshIn, db: AsyncSession = Depends(get_db)):
    await auth_service.logout(db, payload.refresh_token)


_RESET_OK = {"message": "Si el correo existe, recibirás un enlace de recuperación."}
_RESET_EXPIRE_HOURS = 1


@router.post("/forgot-password", status_code=200)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordIn,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user: User | None = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not user.is_active:
        return _RESET_OK  # no enumeration

    raw, token_hash = create_refresh_token()  # reuse same secure generator
    expires = datetime.now(tz=timezone.utc) + timedelta(hours=_RESET_EXPIRE_HOURS)
    db.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires))
    await db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw}"
    background.add_task(mail.send_password_reset, user.email, user.name, reset_link)
    return _RESET_OK


@router.post("/reset-password", status_code=200)
async def reset_password(
    payload: ResetPasswordIn,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    token_hash = hash_refresh_token(payload.token)
    now = datetime.now(tz=timezone.utc)

    prt: PasswordResetToken | None = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used.is_(False),
            PasswordResetToken.expires_at > now,
        )
    )
    if prt is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El enlace es inválido o ha expirado.")

    user: User | None = await db.get(User, prt.user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El enlace es inválido o ha expirado.")

    user.hashed_password = hash_password(payload.new_password)
    prt.used = True
    await db.commit()

    background.add_task(mail.send_password_changed, user.email, user.name)
    return {"message": "Contraseña actualizada correctamente."}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name

    if payload.email is not None:
        new_email = payload.email.lower()
        if new_email != current_user.email:
            conflict = await db.scalar(
                select(User).where(User.email == new_email)
            )
            if conflict:
                raise HTTPException(status.HTTP_409_CONFLICT, "Email ya está en uso.")
            current_user.email = new_email

    if payload.new_password:
        if not payload.current_password or not verify_password(
            payload.current_password, current_user.hashed_password
        ):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Contraseña actual incorrecta.")
        current_user.hashed_password = hash_password(payload.new_password)

    await db.commit()
    await db.refresh(current_user)
    return current_user
