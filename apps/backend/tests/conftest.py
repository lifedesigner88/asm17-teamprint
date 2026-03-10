# ruff: noqa: E402

import os
from pathlib import Path
import sys
import tempfile

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("JWT_SECRET_KEY", "persona-mirror-test-secret-key-2026")
os.environ.setdefault("AUTH_COOKIE_SECURE", "false")
os.environ.setdefault("BACKEND_CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault(
    "DATABASE_URL",
    f"sqlite+pysqlite:///{Path(tempfile.gettempdir()) / 'persona_mirror_backend_test.sqlite3'}",
)

from fastapi.testclient import TestClient
import pytest

from app.common.db import Base, SessionLocal, engine
from app.features.auth.service import sync_admin_seed
from app.main import app


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        sync_admin_seed(db)
    yield


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client
