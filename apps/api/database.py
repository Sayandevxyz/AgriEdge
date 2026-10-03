"""
AgriEdge Database Session & Engine Configuration
Supports PostgreSQL and SQLite for local development out-of-the-box.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from apps.api.config import settings

db_url = settings.DATABASE_URL

# Fix deprecated postgres:// prefix if provided by cloud platforms
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True
        )
    except (ModuleNotFoundError, ImportError) as e:
        if "postgresql://" in db_url and "postgresql+" not in db_url:
            # Fallback to psycopg2 if psycopg 3 is missing, or vice versa
            alt_driver = "postgresql+psycopg2://" if "psycopg" in str(e) else "postgresql+psycopg://"
            alt_url = db_url.replace("postgresql://", alt_driver, 1)
            engine = create_engine(alt_url, pool_pre_ping=True)
        else:
            raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
