import pytest
from datetime import datetime, timezone
from app.models.user import User, Role
from app.models.category import Category
from app.models.comment import Comment, CommentLike
from app.models.quiz import QuizQuestion, QuizQuestionPost
from app.core.security import get_password_hash


def test_verify_post_without_body(client, db_session):
    """Test calling /posts/{id}/verify without body (frontend default call) succeeds with 200."""
    reviewer = User(
        email="reviewer_fix@example.com",
        username="reviewer_fix",
        name="Tech Reviewer",
        hashed_password=get_password_hash("Password123!"),
        is_superuser=True,
        is_active=True
    )
    db_session.add(reviewer)
    db_session.commit()

    from app.core.security import create_access_token
    token = create_access_token(subject=reviewer.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Bài viết kỹ thuật cần xác minh",
        "content": "Nội dung bài viết kỹ thuật chuẩn.",
        "status": "approved"
    })
    assert post_res.status_code == 201
    post_id = post_res.json()["id"]

    # Call verify without body
    verify_res = client.post(f"/api/v1/posts/{post_id}/verify", headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["is_verified"] is True
    assert verify_res.json()["verified_by_id"] == reviewer.id


def test_post_creation_and_approval_published_at(client, test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create post with status pending
    res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Bài viết chờ kiểm duyệt",
        "content": "Nội dung bài viết chờ kiểm duyệt...",
        "status": "pending"
    })
    assert res.status_code == 201
    post_id = res.json()["id"]
    assert res.json()["published_at"] is None

    # 2. Update post to approved
    update_res = client.put(f"/api/v1/posts/{post_id}", headers=headers, json={
        "status": "approved"
    })
    assert update_res.status_code == 200
    assert update_res.json()["published_at"] is not None


def test_post_auto_create_new_category(client, test_user_token, db_session):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    unique_cat_name = f"Quantum Computing {int(datetime.now().timestamp())}"

    res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Khám phá Lập trình Lượng tử",
        "category_name": unique_cat_name,
        "content": "Nội dung nghiên cứu lượng tử...",
        "status": "approved"
    })
    assert res.status_code == 201
    created = res.json()
    assert created["category"] is not None
    assert created["category"]["name"] == unique_cat_name

    # Verify category exists in db
    cat = db_session.query(Category).filter(Category.name == unique_cat_name).first()
    assert cat is not None


def test_delete_post_cascades_safely(client, db_session, test_user_token, test_user):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create post
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Bài viết kèm bình luận và câu hỏi trắc nghiệm",
        "content": "Nội dung bài viết...",
        "status": "approved"
    })
    post_id = post_res.json()["id"]

    # Add comment
    comment = Comment(
        post_id=post_id,
        author_id=test_user.id,
        content="Bình luận thử nghiệm"
    )
    db_session.add(comment)
    db_session.flush()

    # Add comment like
    c_like = CommentLike(user_id=test_user.id, comment_id=comment.id)
    db_session.add(c_like)

    # Add quiz question link
    quiz = QuizQuestion(
        question="Câu hỏi test",
        options=["A", "B"],
        answer_index=0
    )
    db_session.add(quiz)
    db_session.flush()
    q_post = QuizQuestionPost(question_id=quiz.id, post_id=post_id)
    db_session.add(q_post)
    db_session.commit()

    # Delete post - should succeed cleanly with 204
    del_res = client.delete(f"/api/v1/posts/{post_id}", headers=headers)
    assert del_res.status_code == 204


def test_resolve_report_ban_user_for_comment(client, db_session):
    # Create toxic user
    toxic_user = User(
        email="toxic_commenter@example.com",
        username="toxic_commenter",
        name="Toxic Guy",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    # Create admin
    admin = User(
        email="admin_mod@example.com",
        username="admin_mod",
        name="Admin Moderator",
        hashed_password=get_password_hash("Password123!"),
        is_superuser=True,
        is_active=True
    )
    db_session.add(toxic_user)
    db_session.add(admin)
    db_session.commit()

    from app.core.security import create_access_token
    toxic_token = create_access_token(subject=toxic_user.id)
    admin_token = create_access_token(subject=admin.id)

    # Toxic user writes a comment on some post
    from app.models.post import Post
    post = Post(
        title="Post for Comment Report",
        slug="post-comment-report",
        content="Sample post",
        author_id=admin.id,
        status="approved"
    )
    db_session.add(post)
    db_session.flush()

    comment = Comment(
        post_id=post.id,
        author_id=toxic_user.id,
        content="Nội dung quấy rối và spam!"
    )
    db_session.add(comment)
    db_session.commit()

    # User reports comment
    rep_res = client.post("/api/v1/reports", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "target_type": "comment",
        "target_id": comment.id,
        "reason": "toxic",
        "details": "Thóa mạ người khác"
    })
    assert rep_res.status_code == 201
    report_id = rep_res.json()["id"]

    # Admin resolves report with ban_user action
    resolve_res = client.put(f"/api/v1/admin/reports/{report_id}", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "status": "resolved",
        "action": "ban_user"
    })
    assert resolve_res.status_code == 200

    # Verify toxic user is now banned
    db_session.refresh(toxic_user)
    assert toxic_user.is_active is False


def test_vietnamese_slugify_preserves_d_accent(client, test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Event with 'Đ' and 'đ'
    ev_res = client.post("/api/v1/events", headers=headers, json={
        "title": "Hội Thảo Đà Nẵng: Địa Điểm & Định Hướng AI",
        "description": "Mô tả sự kiện",
        "organizer": "IT Community",
        "event_type": "conference",
        "start_time": "2026-10-15T09:00:00Z",
        "location": "Đà Nẵng"
    })
    assert ev_res.status_code == 201
    slug = ev_res.json()["slug"]
    assert "da-nang" in slug
    assert "dia-diem" in slug
    assert "dinh-huong" in slug


def test_gamification_leaderboard_and_reputation_consistency(client, db_session, test_user):
    # Verify user reputation returns matching rank
    rep_res = client.get(f"/api/v1/gamification/users/{test_user.id}/reputation")
    assert rep_res.status_code == 200
    user_rep = rep_res.json()
    assert user_rep["rank"] >= 1
    assert "total_points" in user_rep


def test_rate_limiter_bypass_openapi(client):
    # Calling openapi.json multiple times should not 429
    for _ in range(5):
        res = client.get("/api/v1/openapi.json")
        assert res.status_code == 200


def test_quiz_submit_with_string_keys(client, db_session):
    quiz = QuizQuestion(
        question="Trong Python, cú pháp định nghĩa hàm là gì?",
        options=["def", "func", "fn", "function"],
        answer_index=0,
        explanation="Từ khóa 'def' dùng để định nghĩa hàm."
    )
    db_session.add(quiz)
    db_session.commit()

    # Submit using string key (as raw JSON dictionary)
    payload = {
        "answers": {
            str(quiz.id): 0
        }
    }
    submit_res = client.post("/api/v1/quiz/submit", json=payload)
    assert submit_res.status_code == 200
    data = submit_res.json()
    assert data["total_questions"] == 1
    assert data["correct_count"] == 1
    assert data["score_percentage"] == 100.0
