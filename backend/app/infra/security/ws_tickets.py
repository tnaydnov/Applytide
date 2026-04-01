"""
WebSocket Ticket Module

Single-use, short-lived tickets for WebSocket authentication.

Instead of passing long-lived JWTs via query parameters (which appear in
server logs, Nginx access logs, and browser history), the frontend requests
a random opaque ticket, stored in Redis with a 30-second TTL.  The WS
handshake consumes (deletes) the ticket on first use -- replays are
impossible.

Usage:
    # In the HTTP endpoint (sync)
    ticket = create_ws_ticket(user_id)

    # In the WS handler (sync or async - just string + Redis GET/DEL)
    user_id = consume_ws_ticket(ticket)
"""

from __future__ import annotations

import secrets
from typing import Optional
from uuid import UUID

from redis.exceptions import RedisError

from ...infra.cache.redis_client import get_redis, redis_key
from ...infra.logging import get_logger

logger = get_logger(__name__)

_WS_TICKET_TTL: int = 30  # seconds - must be used almost immediately


def _ticket_key(ticket: str) -> str:
    return redis_key("ws", "ticket", ticket)


def create_ws_ticket(user_id: UUID) -> str:
    """
    Create a single-use WebSocket ticket.

    Stores ``user_id`` in Redis under a random key with a 30-second TTL.

    Returns:
        The opaque ticket string the client must pass as ``?ticket=…``
    """
    ticket = secrets.token_urlsafe(32)
    key = _ticket_key(ticket)
    try:
        r = get_redis()
        r.setex(key, _WS_TICKET_TTL, str(user_id))
        logger.debug("WS ticket created", extra={"user_id": str(user_id)})
    except RedisError:
        logger.error("Failed to store WS ticket in Redis", exc_info=True)
        raise
    return ticket


def consume_ws_ticket(ticket: str) -> Optional[UUID]:
    """
    Validate and consume a single-use WebSocket ticket.

    Atomically retrieves and deletes the ticket from Redis.  Returns the
    associated user_id, or ``None`` if the ticket is invalid / expired /
    already consumed.
    """
    key = _ticket_key(ticket)
    try:
        r = get_redis()
        # GET + DELETE in a pipeline for atomicity
        pipe = r.pipeline(transaction=True)
        pipe.get(key)
        pipe.delete(key)
        user_id_str, _ = pipe.execute()

        if not user_id_str:
            logger.warning("WS ticket invalid or expired", extra={"ticket_prefix": ticket[:8]})
            return None

        logger.debug("WS ticket consumed", extra={"user_id": user_id_str})
        return UUID(user_id_str)
    except RedisError:
        logger.error("Redis error consuming WS ticket", exc_info=True)
        return None
    except (ValueError, AttributeError):
        logger.warning("Corrupt WS ticket data", extra={"ticket_prefix": ticket[:8]})
        return None
