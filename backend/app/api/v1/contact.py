"""Public contact form — sends an email to the platform inbox.

No auth. Rate-limited (slowapi) and protected by a honeypot field to deter
spam bots. Email delivery degrades gracefully (logged) when SMTP is unset.
"""

from __future__ import annotations

import html as html_lib
import logging

from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr, Field

from app.config import get_settings
from app.ratelimit import limiter
from app.services import email_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Contact"])


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)
    # Honeypot: real users leave this empty; bots tend to fill every field.
    website: str = Field("", max_length=200)


@router.post("/contact", status_code=200)
@limiter.limit("5/hour")
async def submit_contact(request: Request, data: ContactRequest) -> dict:
    # Honeypot tripped → pretend success without sending anything.
    if data.website.strip():
        logger.info("Contact honeypot tripped (from %s)", data.email)
        return {"sent": True}

    settings = get_settings()
    to = settings.CONTACT_EMAIL or settings.ADMIN_EMAIL or settings.SMTP_FROM
    subject = f"[Contact MjimsAI] {data.subject}"

    safe_name = html_lib.escape(data.name)
    safe_email = html_lib.escape(data.email)
    safe_subject = html_lib.escape(data.subject)
    safe_message = html_lib.escape(data.message).replace("\n", "<br>")
    html = (
        f"<p><strong>Nom:</strong> {safe_name}</p>"
        f"<p><strong>Email:</strong> {safe_email}</p>"
        f"<p><strong>Sujet:</strong> {safe_subject}</p>"
        f"<hr><p>{safe_message}</p>"
    )
    text = f"Nom: {data.name}\nEmail: {data.email}\nSujet: {data.subject}\n\n{data.message}"

    await email_service.send_email(to=to, subject=subject, html=html, text=text)
    return {"sent": True}
