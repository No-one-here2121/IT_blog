from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, Role
from app.models.post import Post, PostStatus
from app.models.category import Category
from app.models.tag import Tag
from app.core.security import create_access_token, get_password_hash


def test_post_invalid_category_id_rejected(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. create_post with nonexistent category_id
    resp = client.post(
        "/api/v1/posts",
        headers=headers,
        json={
            "title": "Post with Bad Category ID",
            "content": "Valid markdown content for testing.",
            "category_id": 999999
        }
    )
    assert resp.status_code == 400
    assert "Chuyên mục" in resp.json()["detail"]

    # Create valid post
    valid_resp = client.post(
        "/api/v1/posts",
        headers=headers,
        json={
            "title": "Post for Updating Category",
            "content": "Valid markdown content for testing.",
            "category_name": "Testing Valid Cat"
        }
    )
    assert valid_resp.status_code == 201
    post_id = valid_resp.json()["id"]

    # 2. update_post with nonexistent category_id
    up_resp = client.put(
        f"/api/v1/posts/{post_id}",
        headers=headers,
        json={"category_id": 888888}
    )
    assert up_resp.status_code == 400
    assert "Chuyên mục" in up_resp.json()["detail"]


def test_roadmap_invalid_category_and_steps(client: TestClient, db_session: Session, test_user: User, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. create_roadmap with invalid category_id
    bad_cat_resp = client.post(
        "/api/v1/roadmaps",
        headers=headers,
        json={
            "title": "Roadmap with Bad Category",
            "description": "Description here",
            "category_id": 999999
        }
    )
    assert bad_cat_resp.status_code == 400
    assert "Chuyên mục" in bad_cat_resp.json()["detail"]

    # 2. create_roadmap with nonexistent step post_id (sanitizes post_id to None safely)
    good_resp = client.post(
        "/api/v1/roadmaps",
        headers=headers,
        json={
            "title": "Safe Steps Roadmap",
            "description": "Safe step description",
            "steps": [
                {
                    "title": "Step 1",
                    "description": "Step 1 desc",
                    "post_id": 999999
                }
            ]
        }
    )
    assert good_resp.status_code == 201
    rm_data = good_resp.json()
    assert rm_data["steps"][0]["post_id"] is None
    rm_id = rm_data["id"]
    step_id = rm_data["steps"][0]["id"]

    # 3. Toggle step completion on and then off
    toggle_on = client.post(f"/api/v1/roadmaps/{rm_id}/steps/{step_id}/toggle", headers=headers)
    assert toggle_on.status_code == 200
    assert toggle_on.json()["is_completed"] is True

    toggle_off = client.post(f"/api/v1/roadmaps/{rm_id}/steps/{step_id}/toggle", headers=headers)
    assert toggle_off.status_code == 200
    assert toggle_off.json()["is_completed"] is False


def test_auth_reset_password_malformed_token_sub(client: TestClient):
    # Craft token with non-numeric sub
    from jose import jwt
    from app.core.config import settings
    token = jwt.encode({"sub": "invalid_alpha_sub", "type": "reset_password"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewValidPassword123"}
    )
    assert resp.status_code == 400
    assert "không hợp lệ" in resp.json()["detail"]


def test_job_invalid_company_id_rejected(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    resp = client.post(
        "/api/v1/jobs",
        headers=headers,
        json={
            "company_id": 999999,
            "title": "Senior Cloud Engineer",
            "description": "Responsible for designing and operating cloud infrastructure.",
            "location": "Hà Nội",
            "work_type": "remote"
        }
    )
    assert resp.status_code == 400
    assert "Công ty" in resp.json()["detail"]


def test_event_validation_empty_title_and_end_before_start(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    now = datetime.now(timezone.utc)

    # 1. Empty title
    resp1 = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "title": "   ",
            "description": "Detailed workshop description.",
            "organizer": "IT Blog Community",
            "start_time": now.isoformat()
        }
    )
    assert resp1.status_code == 400
    assert "không được để trống" in resp1.json()["detail"]

    # 2. End time before start time
    resp2 = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "title": "Valid Event Title",
            "description": "Detailed workshop description.",
            "organizer": "IT Blog Community",
            "start_time": now.isoformat(),
            "end_time": (now - timedelta(hours=2)).isoformat()
        }
    )
    assert resp2.status_code == 400
    assert "kết thúc" in resp2.json()["detail"]


def test_scheduled_posts_hidden_from_feeds_and_search(client: TestClient, db_session: Session, test_user: User, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create category and tag
    cat = Category(name="Scheduled Category Test", slug="scheduled-cat-test")
    tag = Tag(name="ScheduledTag", slug="scheduledtag")
    db_session.add(cat)
    db_session.add(tag)
    db_session.flush()

    # Create a scheduled post in the future
    future_time = datetime.now(timezone.utc) + timedelta(days=7)
    future_post = Post(
        title="Future Scheduled Post Test Unique123",
        slug="future-scheduled-post-test-unique123",
        content="Secret future content that should not be visible yet.",
        author_id=test_user.id,
        category_id=cat.id,
        status=PostStatus.APPROVED.value,
        scheduled_at=future_time,
        views=999
    )
    future_post.tags.append(tag)
    db_session.add(future_post)
    db_session.commit()

    # 1. Search must not return future scheduled post
    search_resp = client.get("/api/v1/search?q=Unique123")
    assert search_resp.status_code == 200
    assert not any(p["id"] == future_post.id for p in search_resp.json()["items"])

    # 2. Trending feed must not return future scheduled post
    trending_resp = client.get("/api/v1/feeds/trending")
    assert trending_resp.status_code == 200
    assert not any(p["id"] == future_post.id for p in trending_resp.json())

    # 3. For-you feed must not return future scheduled post
    foryou_resp = client.get("/api/v1/feeds/for-you")
    assert foryou_resp.status_code == 200
    assert not any(p["id"] == future_post.id for p in foryou_resp.json()["items"])

    # 4. Categories count should exclude future scheduled post
    cats_resp = client.get("/api/v1/categories")
    assert cats_resp.status_code == 200
    target_cat = next((c for c in cats_resp.json() if c["id"] == cat.id), None)
    assert target_cat is not None
    assert target_cat["post_count"] == 0

    # 5. Tags count should exclude future scheduled post
    tags_resp = client.get("/api/v1/tags")
    assert tags_resp.status_code == 200
    target_tag = next((t for t in tags_resp.json() if t["id"] == tag.id), None)
    assert target_tag is not None
    assert target_tag["post_count"] == 0


def test_moderation_superuser_and_self_protection(client: TestClient, db_session: Session):
    # Setup superuser
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin", description="Admin role")
        db_session.add(admin_role)
        db_session.flush()

    super_user = User(
        email="root_superuser@itblog.local",
        username="rootsuperuser",
        name="Root Super Admin",
        hashed_password=get_password_hash("AdminPass123!"),
        is_active=True,
        is_superuser=True
    )
    super_user.roles.append(admin_role)
    db_session.add(super_user)
    db_session.commit()
    db_session.refresh(super_user)

    admin_token = create_access_token(subject=super_user.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Attempt to deactivate superuser
    deact_resp = client.put(
        f"/api/v1/admin/users/{super_user.id}/status",
        headers=headers,
        json={"is_active": False}
    )
    assert deact_resp.status_code == 400
    assert "Superuser" in deact_resp.json()["detail"] or "Quản trị viên" in deact_resp.json()["detail"]

    # 2. Attempt to change superuser role
    role_resp = client.put(
        f"/api/v1/admin/users/{super_user.id}/role",
        headers=headers,
        json={"role": "user"}
    )
    assert role_resp.status_code == 400
    assert "Quản trị viên tối cao" in role_resp.json()["detail"]


def test_ai_empty_code_snippet_and_question_rejected(client: TestClient, db_session: Session, test_user: User):
    # 1. Empty code snippet
    exp_resp = client.post("/api/v1/ai/explain-code", json={"code_snippet": "   "})
    assert exp_resp.status_code == 400
    assert "không được để trống" in exp_resp.json()["detail"]

    # 2. Empty question on article
    post = Post(
        title="AI Q&A Article Test",
        slug="ai-qa-article-test",
        content="Article content here...",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()

    ask_resp = client.post("/api/v1/ai/ask-article", json={"post_id": post.id, "question": "   "})
    assert ask_resp.status_code == 400
    assert "không được để trống" in ask_resp.json()["detail"]


def test_quiz_invalid_course_id_validation(client: TestClient):
    # 1. create_quiz_question with nonexistent course_id
    q_resp = client.post(
        "/api/v1/quiz/questions",
        json={
            "course_id": 999999,
            "question": "What is Python?",
            "options": ["Language", "Animal"],
            "answer_index": 0
        }
    )
    assert q_resp.status_code == 400
    assert "Khóa học" in q_resp.json()["detail"]

    # 2. generate_quiz_with_ai with nonexistent course_id
    gen_resp = client.post(
        "/api/v1/quiz/generate",
        json={
            "course_id": 999999,
            "count": 3
        }
    )
    assert gen_resp.status_code == 404
    assert "Khóa học" in gen_resp.json()["detail"]


def test_analytics_post_authorization(client: TestClient, db_session: Session, test_user: User):
    author_token = create_access_token(subject=test_user.id)
    headers_author = {"Authorization": f"Bearer {author_token}"}

    # Create post owned by test_user
    post = Post(
        title="Protected Analytics Post",
        slug="protected-analytics-post",
        content="Post content with metrics.",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value,
        views=150
    )
    db_session.add(post)
    db_session.commit()

    # Create another regular user
    other_user = User(
        email="other_visitor@itblog.local",
        username="othervisitor",
        name="Other Visitor",
        hashed_password=get_password_hash("somehashpassword"),
        is_active=True
    )
    db_session.add(other_user)

    # Create admin user
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin")
        db_session.add(admin_role)
        db_session.flush()

    admin_user = User(
        email="analytics_admin@itblog.local",
        username="analyticsadmin",
        name="Analytics Admin",
        hashed_password=get_password_hash("somehashpassword"),
        is_active=True
    )
    admin_user.roles.append(admin_role)
    db_session.add(admin_user)

    db_session.commit()
    db_session.refresh(other_user)
    db_session.refresh(admin_user)

    other_token = create_access_token(subject=other_user.id)
    headers_other = {"Authorization": f"Bearer {other_token}"}
    admin_token = create_access_token(subject=admin_user.id)
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 1. Other user tries to view post analytics -> 403 Forbidden
    other_resp = client.get(f"/api/v1/analytics/posts/{post.id}", headers=headers_other)
    assert other_resp.status_code == 403
    assert "chính mình" in other_resp.json()["detail"]

    # 2. Author views post analytics -> 200 OK
    author_resp = client.get(f"/api/v1/analytics/posts/{post.id}", headers=headers_author)
    assert author_resp.status_code == 200
    assert author_resp.json()["views"] == 150

    # 3. Admin views post analytics -> 200 OK
    admin_resp = client.get(f"/api/v1/analytics/posts/{post.id}", headers=headers_admin)
    assert admin_resp.status_code == 200
