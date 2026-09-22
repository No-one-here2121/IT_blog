from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, Role
from app.models.post import Post, PostStatus
from app.models.comment import Comment, CommentLike
from app.models.moderation import Report, ReportStatus
from app.core.security import create_access_token, get_password_hash


def test_post_detail_permissions_and_view_count(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    now = datetime.now(timezone.utc)
    author_headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Author creates a draft post
    draft_resp = client.post(
        "/api/v1/posts",
        headers=author_headers,
        json={"title": "Draft Post Private", "content": "Confidential draft.", "status": "draft"}
    )
    assert draft_resp.status_code == 201
    draft_id = draft_resp.json()["id"]

    # 2. Author creates a future scheduled post
    future_resp = client.post(
        "/api/v1/posts",
        headers=author_headers,
        json={
            "title": "Future Post Private",
            "content": "Future content.",
            "status": "approved",
            "scheduled_at": (now + timedelta(days=7)).isoformat()
        }
    )
    assert future_resp.status_code == 201
    future_id = future_resp.json()["id"]

    # 3. Author creates an approved published post
    published_resp = client.post(
        "/api/v1/posts",
        headers=author_headers,
        json={"title": "Public Live Post", "content": "Content live.", "status": "approved"}
    )
    assert published_resp.status_code == 201
    pub_id = published_resp.json()["id"]

    # 4. Anonymous user attempts to view draft -> 404
    anon_draft_res = client.get(f"/api/v1/posts/{draft_id}")
    assert anon_draft_res.status_code == 404

    # 5. Anonymous user attempts to view future post -> 404
    anon_future_res = client.get(f"/api/v1/posts/{future_id}")
    assert anon_future_res.status_code == 404

    # 6. Author CAN view their own draft -> 200 (views not incremented on drafts)
    auth_draft_res = client.get(f"/api/v1/posts/{draft_id}", headers=author_headers)
    assert auth_draft_res.status_code == 200
    assert auth_draft_res.json()["views"] == 0

    # 7. Anonymous user views live post -> 200 (views increments)
    pub_res = client.get(f"/api/v1/posts/{pub_id}")
    assert pub_res.status_code == 200
    assert pub_res.json()["views"] == 1


def test_comments_permissions_on_unpublished_posts(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    author_headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create draft post
    post_res = client.post(
        "/api/v1/posts",
        headers=author_headers,
        json={"title": "Draft For Comments Test", "content": "Draft content.", "status": "draft"}
    )
    assert post_res.status_code == 201
    post_id = post_res.json()["id"]

    # Create another user
    other_user = User(
        email="reader_user@example.com",
        username="reader_user",
        name="Reader User",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add(other_user)
    db_session.commit()
    other_token = create_access_token(subject=other_user.id)
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Other user attempts to get comments on draft -> 404
    c_get = client.get(f"/api/v1/posts/{post_id}/comments", headers=other_headers)
    assert c_get.status_code == 404

    # Other user attempts to post comment on draft -> 404
    c_post = client.post(
        f"/api/v1/posts/{post_id}/comments",
        headers=other_headers,
        json={"content": "Illegal comment on draft."}
    )
    assert c_post.status_code == 404

    # Author can view comments on draft -> 200
    c_author_get = client.get(f"/api/v1/posts/{post_id}/comments", headers=author_headers)
    assert c_author_get.status_code == 200


def test_interactions_like_bookmark_unpublished_posts_rejected(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    author_headers = {"Authorization": f"Bearer {test_user_token}"}

    post_res = client.post(
        "/api/v1/posts",
        headers=author_headers,
        json={"title": "Draft For Interactions", "content": "Draft content.", "status": "draft"}
    )
    post_id = post_res.json()["id"]

    other_user = User(
        email="liker_user@example.com",
        username="liker_user",
        name="Liker User",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add(other_user)
    db_session.commit()
    other_token = create_access_token(subject=other_user.id)
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Other user attempts to like draft -> 404
    like_res = client.post(f"/api/v1/posts/{post_id}/like", headers=other_headers)
    assert like_res.status_code == 404

    # Other user attempts to bookmark draft -> 404
    bm_res = client.post(f"/api/v1/posts/{post_id}/bookmark", headers=other_headers)
    assert bm_res.status_code == 404


def test_follow_inactive_user_and_nonexistent_user_rejected(
    client: TestClient,
    db_session: Session,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create an inactive target user
    banned_user = User(
        email="banned_target@example.com",
        username="banned_target",
        name="Banned Target",
        hashed_password=get_password_hash("Password123!"),
        is_active=False
    )
    db_session.add(banned_user)
    db_session.commit()

    # Attempt to follow inactive user -> 400
    fol_res = client.post(f"/api/v1/users/{banned_user.id}/follow", headers=headers)
    assert fol_res.status_code == 400
    assert "vô hiệu hóa" in fol_res.json()["detail"]

    # Attempt to list followers of non-existent user -> 404
    f_list = client.get("/api/v1/users/999999/followers")
    assert f_list.status_code == 404

    # Attempt to list following of non-existent user -> 404
    fing_list = client.get("/api/v1/users/999999/following")
    assert fing_list.status_code == 404


def test_moderation_report_validation_and_resolve_comment_cascade(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Empty reason rejected
    r1 = client.post(
        "/api/v1/reports",
        headers=headers,
        json={"target_type": "post", "target_id": 1, "reason": "   "}
    )
    assert r1.status_code == 400
    assert "Lý do" in r1.json()["detail"]

    # 2. Invalid target_type rejected
    r2 = client.post(
        "/api/v1/reports",
        headers=headers,
        json={"target_type": "invalid_type", "target_id": 1, "reason": "Spam"}
    )
    assert r2.status_code == 400

    # 3. Nonexistent post target_id rejected
    r3 = client.post(
        "/api/v1/reports",
        headers=headers,
        json={"target_type": "post", "target_id": 999999, "reason": "Spam"}
    )
    assert r3.status_code == 404

    # 4. Self report rejected
    r4 = client.post(
        "/api/v1/reports",
        headers=headers,
        json={"target_type": "user", "target_id": test_user.id, "reason": "Reporting myself"}
    )
    assert r4.status_code == 400
    assert "chính mình" in r4.json()["detail"]

    # 5. Resolve report removing comment with likes & replies
    post = Post(title="Post For Moderation", slug="post-for-moderation", content="Content", status="approved", author_id=test_user.id)
    db_session.add(post)
    db_session.flush()

    comment = Comment(post_id=post.id, author_id=test_user.id, content="Toxic comment")
    db_session.add(comment)
    db_session.flush()

    reply = Comment(post_id=post.id, author_id=test_user.id, parent_id=comment.id, content="Reply to toxic")
    like = CommentLike(user_id=test_user.id, comment_id=comment.id)
    db_session.add(reply)
    db_session.add(like)
    db_session.commit()

    # Assign admin role to test_user for resolving reports
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if admin_role and admin_role not in test_user.roles:
        test_user.roles.append(admin_role)
        db_session.commit()

    report = Report(reporter_id=test_user.id, target_type="comment", target_id=comment.id, reason="Harassment")
    db_session.add(report)
    db_session.commit()

    # Resolve report with action="remove_content"
    resolve_res = client.put(
        f"/api/v1/admin/reports/{report.id}",
        headers=headers,
        json={"status": "resolved", "action": "remove_content"}
    )
    assert resolve_res.status_code == 200
    assert db_session.query(Comment).filter(Comment.id == comment.id).first() is None
    db_session.refresh(reply)
    assert reply.parent_id is None


def test_roadmaps_create_validation_empty_title_desc(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Empty title
    r1 = client.post(
        "/api/v1/roadmaps",
        headers=headers,
        json={"title": "   ", "description": "Valid description"}
    )
    assert r1.status_code == 400
    assert "Tiêu đề" in r1.json()["detail"]

    # 2. Empty description
    r2 = client.post(
        "/api/v1/roadmaps",
        headers=headers,
        json={"title": "Valid Roadmap", "description": "   "}
    )
    assert r2.status_code == 400
    assert "Mô tả" in r2.json()["detail"]


def test_notifications_read_all_safe(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Verify mark all notifications as read executes cleanly
    res = client.put("/api/v1/notifications/read-all", headers=headers)
    assert res.status_code == 200
    assert "Đã đánh dấu" in res.json()["message"]


def test_analytics_overview_and_feeds_related_privacy(
    client: TestClient,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Analytics overview should run without error
    overview_res = client.get("/api/v1/analytics/overview")
    assert overview_res.status_code == 200
    assert "total_posts" in overview_res.json()

    # 2. Create draft post
    draft_res = client.post(
        "/api/v1/posts",
        headers=headers,
        json={"title": "Draft For Related", "content": "Draft content.", "status": "draft"}
    )
    draft_id = draft_res.json()["id"]

    # Attempt to fetch related posts for draft -> 404
    rel_res = client.get(f"/api/v1/posts/{draft_id}/related")
    assert rel_res.status_code == 404


def test_quiz_create_question_with_invalid_post_ids_handled_safely(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Pass non-existent post_id in post_ids list
    quiz_payload = {
        "question": "What is dependency injection in FastAPI?",
        "options": ["Depends()", "inject()", "wire()", "service()"],
        "answer_index": 0,
        "difficulty": "medium",
        "post_ids": [999999]
    }
    quiz_res = client.post("/api/v1/quiz/questions", headers=headers, json=quiz_payload)
    assert quiz_res.status_code == 201
    assert quiz_res.json()["ok"] is True
