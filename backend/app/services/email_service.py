"""Email sending via generic SMTP (aiosmtplib).

If SMTP is not configured, emails are logged instead of sent — this keeps OTP
flows testable in development without a real mail server.
"""

from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html: str, text: str | None = None) -> None:
    """Send an email. Falls back to logging when SMTP_HOST is not configured."""
    settings = get_settings()

    if not settings.SMTP_HOST:
        logger.warning(
            "[EMAIL FALLBACK] SMTP not configured — email NOT sent.\n"
            "  To: %s\n  Subject: %s\n  Body:\n%s",
            to, subject, text or html,
        )
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text or _strip_html(html))
    message.add_alternative(html, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_STARTTLS,
        )
        logger.info("Email sent to %s (%s)", to, subject)
    except Exception as e:  # noqa: BLE001 — never let email failure break the request
        logger.error("Failed to send email to %s: %s", to, e)


def _strip_html(html: str) -> str:
    """Very small HTML→text fallback for the plaintext part."""
    import re

    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


# ─── High-level helpers ───────────────────────────────────────────────────────

_OTP_PURPOSE_LABEL = {
    "email_verification": "vérifier votre adresse email",
    "login_2fa": "valider votre connexion",
    "email_change": "confirmer votre nouvelle adresse email",
    "password_reset": "réinitialiser votre mot de passe",
}


async def send_otp_email(to: str, code: str, purpose: str) -> None:
    reason = _OTP_PURPOSE_LABEL.get(purpose, "valider votre demande")
    settings = get_settings()
    subject = f"Votre code MjimsAI : {code}"
    html = f"""
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#4f46e5">MjimsAI</h2>
      <p>Utilisez le code ci-dessous pour {reason} :</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f5f5f5;
                padding:16px;border-radius:12px;text-align:center">{code}</p>
      <p style="color:#888;font-size:13px">Ce code expire dans {settings.OTP_TTL_MINUTES} minutes.
         Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>
    """
    await send_email(to, subject, html)


async def send_admin_invite_email(to: str, link: str, inviter_name: str) -> None:
    settings = get_settings()
    subject = "Invitation à rejoindre l'administration MjimsAI"
    html = f"""
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#4f46e5">MjimsAI — Administration</h2>
      <p>{inviter_name} vous invite à rejoindre le backoffice MjimsAI en tant qu'administrateur.</p>
      <p>Cliquez sur le bouton ci-dessous pour définir votre mot de passe :</p>
      <p style="text-align:center;margin:24px 0">
        <a href="{link}" style="background:#4f46e5;color:#fff;padding:12px 24px;
           border-radius:10px;text-decoration:none;font-weight:600">Définir mon mot de passe</a>
      </p>
      <p style="color:#888;font-size:13px">Ce lien expire dans {settings.INVITE_TTL_HOURS} heures.</p>
      <p style="color:#aaa;font-size:12px">Ou copiez ce lien : {link}</p>
    </div>
    """
    await send_email(to, subject, html)
