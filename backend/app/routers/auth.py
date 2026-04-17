from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app import auth as auth_service
from app.core.security import hash_password, verify_password
from app.dependencies import get_db, get_current_user
from app.models import User
from app.schemas.user import RefreshIn, TokenPair, UserLoginIn, UserOut, UserRegisterIn, UserUpdate

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
