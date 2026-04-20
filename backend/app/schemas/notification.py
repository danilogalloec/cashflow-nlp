from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models import NotificationType


class NotificationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    body: str
    type: NotificationType
    is_read: bool
    created_at: datetime
