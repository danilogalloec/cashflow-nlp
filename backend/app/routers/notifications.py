from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import email as mail
from app.dependencies import get_current_user, get_db
from app.models import (
    Budget, Category, Notification, NotificationType,
    Subscription, Transaction, TransactionDirection, TransactionStatus, User,
)
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])

_ZERO = Decimal("0")


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return rows.all()


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    n = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    return {"count": n or 0}


@router.post("/check-alerts", status_code=status.HTTP_200_OK)
async def check_alerts(
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check budget overruns and upcoming subscriptions; create notifications + send emails."""
    today = date.today()
    y, m = today.year, today.month
    created = 0

    # ── Budget alerts ─────────────────────────────────────────────────────────
    budgets = (await db.scalars(
        select(Budget).where(Budget.user_id == current_user.id, Budget.is_active.is_(True))
    )).all()

    if budgets:
        spent_rows = (await db.execute(
            select(Transaction.category_id, func.sum(Transaction.amount).label("total"))
            .where(
                Transaction.user_id == current_user.id,
                Transaction.direction == TransactionDirection.expense,
                Transaction.status == TransactionStatus.completed,
                extract("year", Transaction.transaction_date) == y,
                extract("month", Transaction.transaction_date) == m,
            )
            .group_by(Transaction.category_id)
        )).all()
        spent_map: dict[uuid.UUID | None, Decimal] = {r.category_id: r.total for r in spent_rows}

        cat_ids = [b.category_id for b in budgets if b.category_id]
        cats: dict[uuid.UUID, Category] = {}
        if cat_ids:
            cat_rows = (await db.scalars(select(Category).where(Category.id.in_(cat_ids)))).all()
            cats = {c.id: c for c in cat_rows}

        for b in budgets:
            spent = spent_map.get(b.category_id, _ZERO)
            pct = float(spent / b.amount * 100) if b.amount > 0 else 0.0
            if pct < 80:
                continue

            dedup_key = f"budget_{b.id}_{y}_{m}"
            exists = await db.scalar(
                select(Notification).where(
                    Notification.user_id == current_user.id,
                    Notification.title.contains(b.name),
                    extract("year", Notification.created_at) == y,
                    extract("month", Notification.created_at) == m,
                )
            )
            if exists:
                continue

            title = f"{'Presupuesto superado' if pct >= 100 else 'Alerta de presupuesto'}: {b.name}"
            body = f"Has usado el {pct:.0f}% de tu presupuesto '{b.name}'. Gastado: ${spent:.2f} / Límite: ${b.amount:.2f}"
            notif = Notification(user_id=current_user.id, title=title, body=body, type=NotificationType.budget_alert)
            db.add(notif)
            created += 1

            cat_name = cats.get(b.category_id).name if b.category_id and b.category_id in cats else b.name
            background.add_task(
                mail.send_budget_alert,
                current_user.email, current_user.name,
                cat_name, pct, f"${spent:.2f}", f"${b.amount:.2f}",
            )

    # ── Upcoming subscriptions (next 7 days) ──────────────────────────────────
    limit_date = today + timedelta(days=7)
    upcoming_subs = (await db.scalars(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.is_active.is_(True),
            Subscription.next_due >= today,
            Subscription.next_due <= limit_date,
        )
    )).all()

    for sub in upcoming_subs:
        days = (sub.next_due - today).days
        exists = await db.scalar(
            select(Notification).where(
                Notification.user_id == current_user.id,
                Notification.title.contains(sub.name),
                Notification.type == NotificationType.subscription_due,
                extract("year", Notification.created_at) == y,
                extract("month", Notification.created_at) == m,
            )
        )
        if exists:
            continue

        when = "hoy" if days == 0 else "mañana" if days == 1 else f"en {days} días"
        title = f"Suscripción próxima: {sub.name}"
        body = f"Tu suscripción '{sub.name}' se cobra {when} ({sub.next_due}). Monto: ${sub.amount:.2f} {sub.currency}"
        notif = Notification(user_id=current_user.id, title=title, body=body, type=NotificationType.subscription_due)
        db.add(notif)
        created += 1

        background.add_task(
            mail.send_subscription_reminder,
            current_user.email, current_user.name,
            sub.name, f"${sub.amount:.2f} {sub.currency}",
            str(sub.next_due), days,
        )

    if created:
        await db.commit()

    return {"created": created}


@router.patch("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notif = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if notif:
        notif.is_read = True
        await db.commit()


@router.patch("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.scalars(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )).all()
    for n in rows:
        n.is_read = True
    await db.commit()


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notif = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if notif:
        await db.delete(notif)
        await db.commit()
