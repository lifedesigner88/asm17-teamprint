import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://persona:persona@localhost:5432/persona_mirror"
)

engine_kwargs: dict = {"future": True, "pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    # Tests use SQLite and need cross-thread access inside TestClient.
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
