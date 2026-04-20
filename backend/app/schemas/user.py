from __future__ import annotations

import re
import uuid
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

_PASSWORD_RE = re.compile(r"^.{8,}$")


class UserRegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    password_confirm: str

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank.")
        return v

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> UserRegisterIn:
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match.")
        return self


class UserLoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    email: str
    is_active: bool
    is_verified: bool
    is_admin: bool


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str
    new_password_confirm: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordIn":
        if self.new_password != self.new_password_confirm:
            raise ValueError("Las contraseñas no coinciden.")
        return self


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = None
    new_password_confirm: str | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be blank.")
        return v

    @field_validator("new_password")
    @classmethod
    def strong_new_password(cls, v: str | None) -> str | None:
        if v is not None and not _PASSWORD_RE.match(v):
            raise ValueError(
                "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número."
            )
        return v

    @model_validator(mode="after")
    def passwords_consistent(self) -> "UserUpdate":
        if self.new_password and not self.current_password:
            raise ValueError("Se requiere la contraseña actual para establecer una nueva.")
        if self.new_password and self.new_password_confirm and self.new_password != self.new_password_confirm:
            raise ValueError("Las contraseñas nuevas no coinciden.")
        return self
