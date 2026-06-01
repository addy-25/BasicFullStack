# backend/tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base
from models import User, Task, IntegrationConnection, IntegrationItem
from auth import hash_password, create_token
from main import get_db

# ── Use SQLite in memory — no PostgreSQL needed for tests ──────────
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}  # needed for SQLite
)
TestingSessionLocal = sessionmaker(bind=engine)


# ── Override the real DB with the test DB ──────────────────────────
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db


# ── Create all tables fresh before each test ──────────────────────
@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(bind=engine)   # create tables
    yield
    Base.metadata.drop_all(bind=engine)     # wipe everything after test


# ── The test client — makes HTTP requests to your app ─────────────
@pytest.fixture
def client():
    return TestClient(app)


# ── A ready-made user in the DB ───────────────────────────────────
@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        email="test@example.com",
        password=hash_password("testpassword")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


# ── A valid JWT token for that user ───────────────────────────────
@pytest.fixture
def auth_headers(test_user):
    token = create_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


# ── A user + a task already in the DB ─────────────────────────────
@pytest.fixture
def test_task(test_user):
    db = TestingSessionLocal()
    task = Task(
        title="Test task",
        energy_level="medium",
        priority_weight=1.0,
        completed=False,
        owner_id=test_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    db.close()
    return task