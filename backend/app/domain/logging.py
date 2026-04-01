"""
Domain-level logging facade.

Domain code imports ``get_logger`` from here instead of reaching into
``app.infra.logging`` — keeping the dependency arrow inward.

The implementation currently delegates to the infrastructure logger,
but the domain layer never has a direct import of ``app.infra``.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass


def get_logger(name: str) -> logging.Logger:
    """Return a stdlib Logger for *name*.

    In production the infra layer configures handlers on the root logger
    (JSON, file rotation, DB sink, etc.) so loggers obtained here
    automatically pick up that configuration.
    """
    return logging.getLogger(name)
