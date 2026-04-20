"""
Email service. If MAIL_USERNAME is not configured, all sends are silently skipped
so the app works without SMTP credentials.
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_BASE_STYLE = """
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
  .wrap { max-width: 560px; margin: 40px auto; background: #1a1a2e;
          border: 1px solid #252540; border-radius: 16px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #7c3aed, #4f46e5);
            padding: 32px 40px; text-align: center; }
  .header h1 { margin: 0; color: #fff; font-size: 24px; font-weight: 700; }
  .header p  { margin: 6px 0 0; color: rgba(255,255,255,.7); font-size: 14px; }
  .body { padding: 32px 40px; }
  .body p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
  .body strong { color: #e2e8f0; }
  .btn { display: inline-block; background: #7c3aed; color: #fff !important;
         padding: 12px 28px; border-radius: 10px; text-decoration: none;
         font-weight: 600; font-size: 14px; margin: 8px 0; }
  .alert-box { background: #1e1e30; border: 1px solid #3a3a5c;
               border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
  .alert-box.warning { border-color: #f59e0b55; }
  .alert-box.danger  { border-color: #ef444455; }
  .footer { padding: 20px 40px; border-top: 1px solid #252540;
            text-align: center; color: #475569; font-size: 12px; }
</style>
"""


def _html(title: str, content: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">{_BASE_STYLE}</head>
<body><div class="wrap">
  <div class="header"><h1>💰 CashFlow</h1><p>{title}</p></div>
  <div class="body">{content}</div>
  <div class="footer">© 2026 CashFlow · <a href="{settings.FRONTEND_URL}" style="color:#7c3aed">Ir a la app</a></div>
</div></body></html>"""


async def _send(to: str, subject: str, html: str) -> None:
    if not settings.MAIL_USERNAME:
        logger.info("Email skipped (MAIL_USERNAME not configured): %s → %s", subject, to)
        return
    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=False,
        )
        msg = MessageSchema(subject=subject, recipients=[to], body=html, subtype=MessageType.html)
        await FastMail(conf).send_message(msg)
        logger.info("Email sent: %s → %s", subject, to)
    except Exception as exc:
        logger.warning("Email send failed (%s → %s): %s", subject, to, exc)


# ── Public send functions ──────────────────────────────────────────────────────

async def send_welcome(to: str, name: str) -> None:
    content = f"""
<p>Hola <strong>{name}</strong>,</p>
<p>¡Bienvenido a <strong>CashFlow</strong>! Tu cuenta ha sido creada exitosamente.</p>
<p>Desde tu dashboard puedes:</p>
<ul style="color:#94a3b8;font-size:15px;line-height:2">
  <li>📊 Ver tu balance y flujo mensual</li>
  <li>💬 Registrar gastos con lenguaje natural</li>
  <li>📅 Gestionar suscripciones y recordatorios</li>
  <li>🎯 Crear presupuestos por categoría</li>
</ul>
<a class="btn" href="{settings.FRONTEND_URL}/dashboard">Ir a mi Dashboard →</a>
"""
    await _send(to, "¡Bienvenido a CashFlow! 🎉", _html("Tu cuenta está lista", content))


async def send_budget_alert(to: str, name: str, budget_name: str, pct: float, spent: str, limit: str) -> None:
    level = "danger" if pct >= 100 else "warning"
    emoji = "🚨" if pct >= 100 else "⚠️"
    msg = "has <strong>superado</strong>" if pct >= 100 else f"has usado el <strong>{pct:.0f}%</strong> de"
    content = f"""
<p>Hola <strong>{name}</strong>,</p>
<p>{emoji} {msg} tu presupuesto <strong>{budget_name}</strong>.</p>
<div class="alert-box {level}">
  <p style="margin:0"><strong>Gastado:</strong> {spent} &nbsp;/&nbsp; <strong>Límite:</strong> {limit}</p>
</div>
<p>Revisa tus gastos recientes para mantener tus finanzas bajo control.</p>
<a class="btn" href="{settings.FRONTEND_URL}/budgets">Ver presupuestos →</a>
"""
    subject = f"{'🚨 Presupuesto superado' if pct >= 100 else '⚠️ Alerta de presupuesto'}: {budget_name}"
    await _send(to, subject, _html("Alerta de presupuesto", content))


async def send_subscription_reminder(to: str, name: str, sub_name: str, amount: str, due_date: str, days: int) -> None:
    when = "hoy" if days == 0 else "mañana" if days == 1 else f"en {days} días"
    content = f"""
<p>Hola <strong>{name}</strong>,</p>
<p>📅 Tu suscripción <strong>{sub_name}</strong> se cobra <strong>{when}</strong> ({due_date}).</p>
<div class="alert-box warning">
  <p style="margin:0"><strong>Monto:</strong> {amount}</p>
</div>
<p>Asegúrate de tener fondos suficientes en tu cuenta vinculada.</p>
<a class="btn" href="{settings.FRONTEND_URL}/subscriptions">Ver suscripciones →</a>
"""
    await _send(to, f"📅 Recordatorio: {sub_name} se cobra {when}", _html("Recordatorio de suscripción", content))


async def send_password_reset(to: str, name: str, reset_link: str) -> None:
    content = f"""
<p>Hola <strong>{name}</strong>,</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta CashFlow.</p>
<a class="btn" href="{reset_link}">Restablecer contraseña →</a>
<p style="margin-top:16px">Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este mensaje.</p>
"""
    await _send(to, "Restablecer contraseña · CashFlow", _html("Restablece tu contraseña", content))


async def send_password_changed(to: str, name: str) -> None:
    content = f"""
<p>Hola <strong>{name}</strong>,</p>
<p>Te informamos que la contraseña de tu cuenta CashFlow fue cambiada exitosamente.</p>
<p>Si no realizaste este cambio, contacta con soporte de inmediato.</p>
<a class="btn" href="{settings.FRONTEND_URL}/login">Acceder a mi cuenta →</a>
"""
    await _send(to, "Contraseña actualizada · CashFlow", _html("Tu contraseña fue cambiada", content))
