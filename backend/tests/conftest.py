"""Pytest fixtures for GlobeTrotter backend tests.

Uses the live Render Postgres database (same as the app) since
there's no Docker setup. Tests that create data should clean up
after themselves.
"""

import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.security import create_access_token, hash_password
from app.models.tables import User


@pytest.fixture
def db():
    """Provide a database session that rolls back after each test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def test_user(db: Session):
    """Create a disposable test user. Rolled back after test."""
    user = User(
        id=uuid.uuid4(),
        email=f"test-{uuid.uuid4().hex[:8]}@test.globetrotter",
        password_hash=hash_password("testpass123"),
        full_name="Test User",
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def test_admin(db: Session):
    """Create a disposable admin user. Rolled back after test."""
    user = User(
        id=uuid.uuid4(),
        email=f"admin-{uuid.uuid4().hex[:8]}@test.globetrotter",
        password_hash=hash_password("adminpass123"),
        full_name="Admin User",
        role="ADMIN",
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def auth_header(test_user):
    """Authorization header with a valid JWT for test_user."""
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_header(test_admin):
    """Authorization header with a valid JWT for test_admin."""
    token = create_access_token(test_admin.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    """FastAPI test client."""
    from fastapi.testclient import TestClient

    from app.main import app

    return TestClient(app)
