"""Shared rate limiter (slowapi).

Keyed by the real client IP. To prevent rate-limit bypass via a spoofed
``X-Forwarded-For`` header, that header is honored ONLY when the direct socket
peer is a configured trusted proxy (``TRUSTED_PROXIES``). Otherwise the direct
peer address is used. When the header is trusted, we walk the chain from the
right and return the first hop that is NOT itself a trusted proxy — i.e. the
address the trusted infrastructure actually observed, never an attacker-supplied
left-most value.
"""

from __future__ import annotations

import ipaddress
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.config import get_settings

logger = logging.getLogger(__name__)


def _ip_in_networks(ip: str, networks: list[str]) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for net in networks:
        try:
            if addr in ipaddress.ip_network(net, strict=False):
                return True
        except ValueError:
            continue
    return False


def get_client_ip(request: Request) -> str:
    """Return the real client IP, resistant to X-Forwarded-For spoofing."""
    peer = request.client.host if request.client else get_remote_address(request)

    trusted = get_settings().trusted_proxies_list
    if not trusted or not _ip_in_networks(peer, trusted):
        # Direct peer is not a trusted proxy → never trust the header.
        return peer

    forwarded = request.headers.get("x-forwarded-for")
    if not forwarded:
        return peer

    # Walk right→left, skipping trusted proxies; first untrusted hop is the client.
    hops = [h.strip() for h in forwarded.split(",") if h.strip()]
    for hop in reversed(hops):
        if not _ip_in_networks(hop, trusted):
            return hop
    return peer


limiter = Limiter(key_func=get_client_ip)
