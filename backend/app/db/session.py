"""
Database session management.

Engine and session factory are created lazily on first access so that
importing models or this module does NOT open a DB connection at import
time.  This makes testing, CLI tools, and import-order issues much easier.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from ..config import settings

# ---------------------------------------------------------------------------
# Lazy singleton engine & session factory
# ---------------------------------------------------------------------------

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """Return the global engine, creating it on first call."""
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            future=True,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """Return the global session factory, creating it on first call."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=get_engine(),
            future=True,
        )
    return _SessionLocal


# Backward-compatible alias (read-only property would break some tests).
# Prefer ``get_engine()`` in new code.
@property  # type: ignore[misc]
def _engine_compat() -> Engine:
    return get_engine()


# Keep ``SessionLocal`` importable for legacy compatibility.
class _SessionLocalProxy:
    """Proxy so ``SessionLocal()`` keeps working without import-time engine."""
    def __call__(self, **kw):  # type: ignore[override]
        return get_session_factory()(**kw)

    def __getattr__(self, name: str):
        return getattr(get_session_factory(), name)


SessionLocal = _SessionLocalProxy()


# ---------------------------------------------------------------------------
# FastAPI dependency & context manager
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a DB session per request, rolls back on error, and closes."""
    db = get_session_factory()()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for DB sessions outside FastAPI requests."""
    db = get_session_factory()()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
