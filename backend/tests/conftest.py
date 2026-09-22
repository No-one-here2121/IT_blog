import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import get_db
from app.models.base import Base
from app.models import Role, Category, Tag
from app.main import app

# In-memory SQLite for high-speed automated testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def init_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed initial test roles
    for r_name in ["admin", "moderator", "author", "user"]:
        if not db.query(Role).filter(Role.name == r_name).first():
            db.add(Role(name=r_name))
    # Seed test categories
    for c_name in ["Frontend", "Backend", "DevOps"]:
        if not db.query(Category).filter(Category.name == c_name).first():
            db.add(Category(name=c_name, slug=c_name.lower()))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session: Session):
    from app.models.user import User
    from app.core.security import get_password_hash
    user = db_session.query(User).filter(User.username == "test_user_fixture").first()
    if not user:
        user = User(
            email="test_user_fixture@example.com",
            username="test_user_fixture",
            name="Test Fixture User",
            hashed_password=get_password_hash("Password123!"),
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def test_user_token(test_user) -> str:
    from app.core.security import create_access_token
    return create_access_token(subject=test_user.id)

