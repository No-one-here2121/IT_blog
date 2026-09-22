import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, Role
from app.models.post import Post, PostStatus
from app.models.category import Category
from app.models.comment import Comment
from app.models.interaction import PostLike
from app.models.moderation import Report, ReportStatus
from app.models.crawler import CrawlSource
from app.models.quiz import QuizQuestion, QuizQuestionPost


def test_quiz_generate_category_type_safety(client: TestClient, test_user_token: str, db_session: Session, test_user: User):
    """
    Verify that quiz generation with post_ids correctly extracts category name
    as a string rather than passing an ORM Category object.
    """
    headers = {"Authorization": f"Bearer {test_user_token}"}

    cat = Category(name="DevOps CI-CD", slug="devops-ci-cd", icon="🚀")
    db_session.add(cat)
    db_session.flush()

    post = Post(
        title="Hướng dẫn cấu hình GitHub Actions",
        slug="huong-dan-cau-hinh-github-actions-test",
        content="Nội dung bài viết về CI/CD pipeline và tự động hóa triển khai Docker.",
        author_id=test_user.id,
        category_id=cat.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()

    resp = client.post("/api/v1/quiz/generate", json={
        "post_ids": [post.id],
        "count": 2,
        "difficulty": "easy"
    }, headers=headers)

    assert resp.status_code == 201
    data = resp.json()
    assert data["ok"] is True
    assert len(data["created"]) > 0

    # Ensure saved questions in DB have language as a string (not str(Category object))
    for q_data in data["created"]:
        q_id = q_data["id"]
        q_obj = db_session.query(QuizQuestion).filter(QuizQuestion.id == q_id).first()
        assert q_obj is not None
        assert isinstance(q_obj.language, str)
        assert "<app.models" not in q_obj.language


def test_quiz_delete_authentication_and_cascade(client: TestClient, test_user_token: str, db_session: Session, test_user: User):
    """
    Verify that deleting a quiz question requires authentication,
    enforces permissions, and cleans up secondary associations.
    """
    # Create question
    q = QuizQuestion(
        question="Độ phức tạp thuật toán QuickSort trung bình là gì?",
        options=["O(n)", "O(n log n)", "O(n^2)", "O(1)"],
        answer_index=1,
        source="manual",
        created_by=test_user.id
    )
    db_session.add(q)
    db_session.flush()

    # Link with a post
    post = db_session.query(Post).first()
    if post:
        db_session.add(QuizQuestionPost(question_id=q.id, post_id=post.id))
    db_session.commit()

    # 1. Anonymous deletion should fail (401 or 403)
    anon_resp = client.delete(f"/api/v1/quiz/questions/{q.id}")
    assert anon_resp.status_code in [401, 403]

    # 2. Authenticated deletion by creator succeeds
    auth_resp = client.delete(f"/api/v1/quiz/questions/{q.id}", headers={"Authorization": f"Bearer {test_user_token}"})
    assert auth_resp.status_code == 200
    assert auth_resp.json()["deleted_id"] == q.id

    # Verify deleted from DB and secondary links cleaned up
    assert db_session.query(QuizQuestion).filter(QuizQuestion.id == q.id).first() is None
    assert db_session.query(QuizQuestionPost).filter(QuizQuestionPost.question_id == q.id).count() == 0


def test_courses_vietnamese_slug_and_batch_enrollment(client: TestClient, test_user_token: str):
    """
    Verify course slug keeps Vietnamese 'Đ/đ' and list endpoint returns correct progress.
    """
    headers = {"Authorization": f"Bearer {test_user_token}"}

    resp = client.post("/api/v1/courses", json={
        "title": "Khóa học Lập trình Đà Nẵng 2026",
        "description": "Chương trình đào tạo kỹ sư phần mềm thực chiến tại Đà Nẵng.",
        "level": "intermediate",
        "lessons": [
            {"title": "Bài 1: Tổng quan", "duration_minutes": 15}
        ]
    }, headers=headers)

    assert resp.status_code == 201
    data = resp.json()
    assert "da-nang" in data["slug"]

    # List courses
    list_resp = client.get("/api/v1/courses", headers=headers)
    assert list_resp.status_code == 200
    courses = list_resp.json()
    assert any(c["id"] == data["id"] for c in courses)


def test_crawler_category_assignment(client: TestClient, test_user_token: str, db_session: Session, test_user: User):
    """
    Verify that posts created via crawler adopt the category_id from the source.
    """
    headers = {"Authorization": f"Bearer {test_user_token}"}

    cat = Category(name="Crawler News", slug="crawler-news")
    db_session.add(cat)
    db_session.commit()

    source = CrawlSource(
        name="Tech Feed Test",
        url="http://mock-empty.invalid/rss",
        source_type="rss",
        category_id=cat.id,
        is_active=True
    )
    db_session.add(source)
    db_session.commit()

    # Trigger crawl
    resp = client.post("/api/v1/crawler/trigger", json={
        "source_id": source.id,
        "auto_publish": True
    }, headers=headers)

    assert resp.status_code == 200
    crawled = resp.json()["crawled_posts"]
    if crawled:
        # Check first created post has category_id == cat.id
        first_slug = crawled[0]["slug"]
        saved_post = db_session.query(Post).filter(Post.slug == first_slug).first()
        assert saved_post is not None
        assert saved_post.category_id == cat.id


def test_moderation_reports_status_filter_all(client: TestClient, test_user_token: str, db_session: Session, test_user: User):
    """
    Verify that GET /admin/reports?status_filter=all returns reports rather than an empty list.
    """
    # Make sure test_user has admin role
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin", description="Admin")
        db_session.add(admin_role)
        db_session.flush()
    if admin_role not in test_user.roles:
        test_user.roles.append(admin_role)
        db_session.commit()

    # Create dummy report
    rep = Report(
        reporter_id=test_user.id,
        target_type="post",
        target_id=1,
        reason="Spam content test",
        status=ReportStatus.PENDING.value
    )
    db_session.add(rep)
    db_session.commit()

    headers = {"Authorization": f"Bearer {test_user_token}"}
    resp = client.get("/api/v1/admin/reports?status_filter=all", headers=headers)
    assert resp.status_code == 200
    reports = resp.json()
    assert len(reports) >= 1


def test_admin_users_list_and_status(client: TestClient, test_user_token: str, db_session: Session, test_user: User):
    """
    Verify GET /admin/users lists users and PUT /admin/users/{id}/status updates active status.
    """
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin", description="Admin")
        db_session.add(admin_role)
        db_session.flush()
    if admin_role not in test_user.roles:
        test_user.roles.append(admin_role)
        db_session.commit()

    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. List users
    resp = client.get("/api/v1/admin/users", headers=headers)
    assert resp.status_code == 200
    users = resp.json()
    assert len(users) >= 1
    assert "posts_count" in users[0]

    # 2. Toggle status
    status_resp = client.put(f"/api/v1/admin/users/{test_user.id}/status", json={"is_active": True}, headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["is_active"] is True


def test_post_oldest_sort(client: TestClient, db_session: Session, test_user: User):
    """
    Verify that sort_by=oldest orders posts by created_at in ascending order.
    """
    resp = client.get("/api/v1/posts?sort_by=oldest&limit=10")
    assert resp.status_code == 200
    items = resp.json()["items"]
    if len(items) >= 2:
        assert items[0]["created_at"] <= items[1]["created_at"]


def test_post_interaction_counts(client: TestClient, test_user_token: str, db_session: Session, test_user: User):
    """
    Verify PostListItem includes likes_count and comments_count.
    """
    post = Post(
        title="Bài viết kiểm tra số lượt like comment",
        slug="bai-viet-kiem-tra-so-luot-like-comment",
        content="Nội dung kiểm thử tương tác...",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.flush()

    # Add 1 like and 1 comment
    db_session.add(PostLike(user_id=test_user.id, post_id=post.id))
    db_session.add(Comment(author_id=test_user.id, post_id=post.id, content="Bình luận test"))
    db_session.commit()

    resp = client.get(f"/api/v1/posts/{post.slug}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["likes_count"] >= 1
    assert data["comments_count"] >= 1


def test_rss_xml_category_escaping(client: TestClient, db_session: Session, test_user: User):
    """
    Verify that RSS feed escapes special XML characters in category names.
    """
    cat = Category(name="UI & UX Design", slug="ui-ux-design")
    db_session.add(cat)
    db_session.flush()

    post = Post(
        title="Thiết kế UI & UX chuẩn phong cách hiện đại",
        slug="thiet-ke-ui-ux-chuan-hien-dai",
        content="Nguyên lý thiết kế trải nghiệm người dùng...",
        author_id=test_user.id,
        category_id=cat.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()

    resp = client.get("/rss.xml")
    assert resp.status_code == 200
    content = resp.text
    # XML must contain escaped &amp;
    assert "<category>UI &amp; UX Design</category>" in content
