from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .base import Base
from ..config import settings

# Engine: pre_ping=True fixes stale connections after long idle times.
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

def get_db():
    """FastAPI dependency: yields a DB session per request and closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
