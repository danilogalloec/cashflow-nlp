from __future__ import annotations

import uuid

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    color: str | None
    icon: str | None
    is_system: bool


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str | None = Field(default=None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: str | None = Field(default=None, max_length=40)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(default=None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: str | None = Field(default=None, max_length=40)
