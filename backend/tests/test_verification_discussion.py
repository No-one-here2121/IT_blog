import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, Role
from app.models.post import Post, PostStatus
from app.models.comment import Comment
from app.models.gamification import ReputationLog
from app.core.security import create_access_token


def test_verification_and_tech_version(client: TestClient, db_session: Session, test_user: User, test_user_token: str):
    headers_author = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a post
    post_payload = {
        "title": "Tối ưu hóa SQLAlchemy 2.0 Async Session",
        "content": "Sử dụng async_sessionmaker và select() syntax thay cho legacy Query API.",
        "tech_stack_version": "SQLAlchemy 2.0.25 / Python 3.11"
    }
    post_resp = client.post("/api/v1/posts", json=post_payload, headers=headers_author)
    assert post_resp.status_code == 201
    post_data = post_resp.json()
    post_id = post_data["id"]
    assert post_data["is_verified"] is False
    assert post_data["tech_stack_version"] == "SQLAlchemy 2.0.25 / Python 3.11"

    # 2. Normal author tries to verify their own post -> 403 Forbidden
    verify_payload = {
        "is_verified": True,
        "verification_notes": "Code đã được test trong môi trường production.",
        "tech_stack_version": "SQLAlchemy 2.0.25"
    }
    unauth_resp = client.post(f"/api/v1/posts/{post_id}/verify", json=verify_payload, headers=headers_author)
    assert unauth_resp.status_code == 403

    # 3. Create admin user & token
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    admin_user = User(
        email="expert_reviewer@itblog.com",
        username="expert_reviewer",
        name="Chief Tech Reviewer",
        hashed_password="mock",
        is_active=True,
        is_superuser=True
    )
    if admin_role:
        admin_user.roles.append(admin_role)
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)

    admin_token = create_access_token(subject=admin_user.id)
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 4. Expert verifies the post
    verify_resp = client.post(f"/api/v1/posts/{post_id}/verify", json=verify_payload, headers=headers_admin)
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["is_verified"] is True
    assert v_data["verified_by_id"] == admin_user.id
    assert v_data["verification_notes"] == "Code đã được test trong môi trường production."

    # 5. Author receives reputation points for verified post
    rep = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == test_user.id,
        ReputationLog.action == "verified_post"
    ).first()
    assert rep is not None
    assert rep.points == 50

    # 6. Mark deprecated with warning
    deprecate_payload = {
        "is_verified": True,
        "is_deprecated": True,
        "deprecated_warning": "SQLAlchemy 1.4 syntax trong bài viết đã bị End-of-Life, vui lòng dùng SQLAlchemy 2.0."
    }
    dep_resp = client.post(f"/api/v1/posts/{post_id}/verify", json=deprecate_payload, headers=headers_admin)
    assert dep_resp.status_code == 200
    assert dep_resp.json()["is_deprecated"] is True
    assert "End-of-Life" in dep_resp.json()["deprecated_warning"]


def test_technical_discussion_pin_and_accepted_answer(
    client: TestClient, db_session: Session, test_user: User, test_user_token: str
):
    headers_author = {"Authorization": f"Bearer {test_user_token}"}

    # Post author creates a discussion post
    post = Post(
        title="Tại sao nên dùng uv thay thế cho pip và poetry?",
        slug="tai-sao-dung-uv-thay-the-pip",
        content="uv được viết bằng Rust với tốc độ resolver nhanh hơn 10-100 lần. Mời anh em thảo luận.",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # Create community member user 2
    user_dev = User(
        email="developer_pro@itblog.com",
        username="developer_pro",
        name="Senior Rust Dev",
        hashed_password="mock",
        is_active=True
    )
    db_session.add(user_dev)
    db_session.commit()
    db_session.refresh(user_dev)

    token_dev = create_access_token(subject=user_dev.id)
    headers_dev = {"Authorization": f"Bearer {token_dev}"}

    # Dev comments
    c1_resp = client.post(
        f"/api/v1/posts/{post.id}/comments",
        json={"content": "uv có global cache và hỗ trợ pip-tools drop-in replacement hoàn hảo."},
        headers=headers_dev
    )
    assert c1_resp.status_code == 201
    c1_id = c1_resp.json()["id"]

    # Author comments
    c2_resp = client.post(
        f"/api/v1/posts/{post.id}/comments",
        json={"content": "Lưu ý quan trọng: Pin câu trả lời này để anh em dễ nắm bắt syntax."},
        headers=headers_author
    )
    assert c2_resp.status_code == 201
    c2_id = c2_resp.json()["id"]

    # Dev tries to pin -> 403 Forbidden
    unauth_pin = client.post(f"/api/v1/comments/{c1_id}/pin", headers=headers_dev)
    assert unauth_pin.status_code == 403

    # Author pins c2
    pin_resp = client.post(f"/api/v1/comments/{c2_id}/pin", headers=headers_author)
    assert pin_resp.status_code == 200
    assert pin_resp.json()["is_pinned"] is True

    # Dev tries to accept answer -> 403 Forbidden
    unauth_accept = client.post(f"/api/v1/comments/{c1_id}/accept", headers=headers_dev)
    assert unauth_accept.status_code == 403

    # Author marks c1 as Accepted Answer
    accept_resp = client.post(f"/api/v1/comments/{c1_id}/accept", headers=headers_author)
    assert accept_resp.status_code == 200
    assert accept_resp.json()["is_accepted_answer"] is True

    # Dev receives reputation (+20) for accepted answer
    rep = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == user_dev.id,
        ReputationLog.action == "accepted_answer"
    ).first()
    assert rep is not None
    assert rep.points == 20

    # Verify root comments listing has pinned and accepted comments sorted to the top
    list_resp = client.get(f"/api/v1/posts/{post.id}/comments")
    assert list_resp.status_code == 200
    comments = list_resp.json()
    assert len(comments) == 2
    # Pinned comment c2 should be first
    assert comments[0]["id"] == c2_id
    assert comments[0]["is_pinned"] is True
    # Accepted comment c1 should be second
    assert comments[1]["id"] == c1_id
    assert comments[1]["is_accepted_answer"] is True
