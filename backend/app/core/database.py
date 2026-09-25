import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings


def _create_database_engine():
    if settings.DATABASE_URL.startswith("sqlite"):
        return create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    try:
        pg_engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        with pg_engine.connect() as conn:
            pass
        return pg_engine
    except Exception as exc:
        print(f"Warning: PostgreSQL connection failed ({exc}). Falling back to SQLite database.")
        return create_engine(
            f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'it_blog.db')}",
            connect_args={"check_same_thread": False}
        )


engine = _create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency generator for FastAPI routes that yields a database session
    and ensures it's closed after request lifecycle.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
