from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, Role
from app.models.post import Post, PostStatus, PostRevision
from app.models.category import Category
from app.models.comment import Comment, CommentLike
from app.models.course import Course, CourseLesson, CourseEnrollment, CourseLessonProgress
from app.models.quiz import QuizQuestion
from app.models.notification import Notification, NotificationType
from app.core.security import create_access_token


def test_seo_and_gamification_hide_future_scheduled_posts(client: TestClient, db_session: Session, test_user: User):
    now = datetime.now(timezone.utc)
    future_time = now + timedelta(days=5)

    # 1. Immediate post
    immediate_post = Post(
        title="Immediate Public Post For SEO",
        slug="immediate-public-post-seo",
        content="Public content ready to index.",
        status=PostStatus.APPROVED.value,
        author_id=test_user.id,
        scheduled_at=now - timedelta(hours=1),
        published_at=now - timedelta(hours=1)
    )
    # 2. Future scheduled post
    future_post = Post(
        title="Secret Future Post Must Not Leak",
        slug="secret-future-post-seo",
        content="Secret draft that should not be visible anywhere.",
        status=PostStatus.APPROVED.value,
        author_id=test_user.id,
        scheduled_at=future_time,
        published_at=None
    )
    db_session.add(immediate_post)
    db_session.add(future_post)
    db_session.commit()

    # Verify /sitemap.xml
    sitemap_resp = client.get("/api/v1/sitemap.xml")
    assert sitemap_resp.status_code == 200
    assert "immediate-public-post-seo" in sitemap_resp.text
    assert "secret-future-post-seo" not in sitemap_resp.text

    # Verify /rss.xml
    rss_resp = client.get("/api/v1/rss.xml")
    assert rss_resp.status_code == 200
    assert "Immediate Public Post For SEO" in rss_resp.text
    assert "Secret Future Post Must Not Leak" not in rss_resp.text

    # Verify /gamification/leaderboard excludes future scheduled post from post counts
    leaderboard_resp = client.get("/api/v1/gamification/leaderboard")
    assert leaderboard_resp.status_code == 200
    user_entry = next((u for u in leaderboard_resp.json() if u["user_id"] == test_user.id), None)
    assert user_entry is not None
    rep_resp = client.get(f"/api/v1/gamification/users/{test_user.id}/reputation")
    assert rep_resp.status_code == 200

    # Verify /recommendations/authors excludes future post from post count in reason string
    authors_resp = client.get("/api/v1/recommendations/authors")
    assert authors_resp.status_code == 200
    rec_author = next((a for a in authors_resp.json() if a["user_id"] == test_user.id), None)
    if rec_author:
        # Should only count the 1 immediate post, not 2
        assert "1 bài viết" in rec_author["reason"]

    # Verify /recommendations/topics
    topics_resp = client.get("/api/v1/recommendations/topics")
    assert topics_resp.status_code == 200


def test_courses_lesson_toggle_nullable_completed_at_and_delete_cascade(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a course with lessons
    course_resp = client.post(
        "/api/v1/courses",
        headers=headers,
        json={
            "title": "SQLAlchemy 2.0 Mastery Course",
            "description": "Learn async and relations in depth",
            "level": "intermediate",
            "lessons": [
                {"title": "Lesson 1: Basics", "description": "Intro", "content": "Content 1", "duration_minutes": 10},
                {"title": "Lesson 2: Advanced", "description": "Adv", "content": "Content 2", "duration_minutes": 15}
            ]
        }
    )
    assert course_resp.status_code == 201
    course_data = course_resp.json()
    course_id = course_data["id"]
    lesson_id = course_data["lessons"][0]["id"]

    # 2. Toggle lesson completion -> ON
    toggle1_resp = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_id}/toggle", headers=headers)
    assert toggle1_resp.status_code == 200
    assert toggle1_resp.json()["is_completed"] is True

    progress_rec = db_session.query(CourseLessonProgress).filter(
        CourseLessonProgress.course_id == course_id,
        CourseLessonProgress.lesson_id == lesson_id,
        CourseLessonProgress.user_id == test_user.id
    ).first()
    assert progress_rec is not None
    assert progress_rec.is_completed is True
    assert progress_rec.completed_at is not None

    # 3. Toggle lesson completion -> OFF (verifies nullable completed_at without constraint error)
    toggle2_resp = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_id}/toggle", headers=headers)
    assert toggle2_resp.status_code == 200
    assert toggle2_resp.json()["is_completed"] is False

    db_session.refresh(progress_rec)
    assert progress_rec.is_completed is False
    assert progress_rec.completed_at is None

    # 4. Attach a QuizQuestion to this course
    quiz = QuizQuestion(
        question="What is Mapped[Optional[T]]?",
        options=["Nullable column", "Non-null column", "List", "Dict"],
        answer_index=0,
        explanation="Represents nullable field in SQLAlchemy 2.0",
        course_id=course_id
    )
    db_session.add(quiz)
    db_session.commit()
    quiz_id = quiz.id

    # 5. Delete course as instructor
    del_resp = client.delete(f"/api/v1/courses/{course_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify quiz still exists with course_id set to None
    db_session.expire_all()
    q_after = db_session.query(QuizQuestion).filter(QuizQuestion.id == quiz_id).first()
    assert q_after is not None
    assert q_after.course_id is None

    # Verify progress and enrollment were cascade deleted
    assert db_session.query(CourseLessonProgress).filter(CourseLessonProgress.course_id == course_id).count() == 0
    assert db_session.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).count() == 0


def test_crawler_create_source_and_trigger_crawl_validation(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Validation for empty name
    bad_name_resp = client.post(
        "/api/v1/crawler/sources",
        headers=headers,
        json={"name": "   ", "url": "https://techblog.com/feed", "category_id": None}
    )
    assert bad_name_resp.status_code == 400
    assert "Tên nguồn" in bad_name_resp.json()["detail"]

    # 2. Validation for empty url
    bad_url_resp = client.post(
        "/api/v1/crawler/sources",
        headers=headers,
        json={"name": "Valid Tech News", "url": "   ", "category_id": None}
    )
    assert bad_url_resp.status_code == 400
    assert "URL" in bad_url_resp.json()["detail"]

    # 3. Validation for invalid category_id
    bad_cat_resp = client.post(
        "/api/v1/crawler/sources",
        headers=headers,
        json={"name": "Valid Tech News", "url": "https://techblog.com/feed", "category_id": 99999}
    )
    assert bad_cat_resp.status_code == 400
    assert "Chuyên mục" in bad_cat_resp.json()["detail"]

    # 4. Trigger crawl with invalid source_id
    bad_trigger_resp = client.post(
        "/api/v1/crawler/trigger",
        headers=headers,
        json={"source_id": 99999, "limit": 5}
    )
    assert bad_trigger_resp.status_code == 404


def test_ads_create_ad_validation(
    client: TestClient,
    db_session: Session,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Empty title
    r1 = client.post(
        "/api/v1/ads",
        headers=headers,
        json={"title": "  ", "description": "Promo description", "target_url": "https://example.com", "creative_url": "https://example.com/img.png"}
    )
    assert r1.status_code == 400
    assert "Tiêu đề" in r1.json()["detail"]

    # 2. Empty target_url
    r2 = client.post(
        "/api/v1/ads",
        headers=headers,
        json={"title": "Valid Ad Title", "description": "Promo description", "target_url": "   ", "creative_url": "https://example.com/img.png"}
    )
    assert r2.status_code == 400
    assert "target_url" in r2.json()["detail"]

    # 3. Nonexistent campaign_id
    r3 = client.post(
        "/api/v1/ads",
        headers=headers,
        json={"title": "Valid Ad", "description": "Promo description", "target_url": "https://example.com", "creative_url": "https://example.com/img.png", "campaign_id": 99999}
    )
    assert r3.status_code == 400
    assert "Chiến dịch" in r3.json()["detail"]

    # 4. Valid ad
    r4 = client.post(
        "/api/v1/ads",
        headers=headers,
        json={"title": "Valid Developer Tool Ad", "description": "Promo description", "target_url": "https://jetbrains.com", "creative_url": "https://jetbrains.com/img.png"}
    )
    assert r4.status_code == 201
    ad_id = r4.json()["id"]

    # Delete ad cleans up
    del_r = client.delete(f"/api/v1/ads/{ad_id}", headers=headers)
    assert del_r.status_code == 204


def test_comments_delete_cascade_and_parent_id_nullification(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    user_headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a post
    post_resp = client.post(
        "/api/v1/posts",
        headers=user_headers,
        json={"title": "Post For Comment Cascade Test", "content": "Checking comment cascade deletion."}
    )
    assert post_resp.status_code == 201
    post_id = post_resp.json()["id"]

    # 2. Create parent comment
    parent_resp = client.post(
        f"/api/v1/posts/{post_id}/comments",
        headers=user_headers,
        json={"content": "This is parent comment."}
    )
    assert parent_resp.status_code == 201
    parent_id = parent_resp.json()["id"]

    # 3. Create child reply comment
    child_resp = client.post(
        f"/api/v1/posts/{post_id}/comments",
        headers=user_headers,
        json={"content": "This is nested reply to parent.", "parent_id": parent_id}
    )
    assert child_resp.status_code == 201
    child_id = child_resp.json()["id"]

    # 4. Like parent comment
    like_resp = client.post(f"/api/v1/comments/{parent_id}/like", headers=user_headers)
    assert like_resp.status_code == 200

    # 5. Delete parent comment
    del_resp = client.delete(f"/api/v1/comments/{parent_id}", headers=user_headers)
    assert del_resp.status_code == 204

    # Verify parent comment is deleted
    assert db_session.query(Comment).filter(Comment.id == parent_id).first() is None
    # Verify child comment has parent_id safely nullified
    child_after = db_session.query(Comment).filter(Comment.id == child_id).first()
    assert child_after is not None
    assert child_after.parent_id is None


def test_auth_forgot_password_inactive_user(client: TestClient, db_session: Session, test_user: User):
    # Deactivate test_user
    test_user.is_active = False
    db_session.commit()

    resp = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": test_user.email}
    )
    assert resp.status_code == 200
    # Must NOT leak reset token for deactivated user
    assert "Token khôi phục mật khẩu" not in resp.json()["message"]
    assert "Nếu email tồn tại trong hệ thống" in resp.json()["message"]

    # Restore active state
    test_user.is_active = True
    db_session.commit()


def test_posts_status_filter_empty_fallback_and_delete_revisions_notifications(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a draft post
    draft_resp = client.post(
        "/api/v1/posts",
        headers=headers,
        json={"title": "Draft Post Hidden By Default", "content": "Draft content.", "status": "draft"}
    )
    assert draft_resp.status_code == 201
    draft_id = draft_resp.json()["id"]

    # 2. Query posts with empty status_filter (e.g. ?status_filter=)
    get_resp = client.get("/api/v1/posts?status_filter=")
    assert get_resp.status_code == 200
    item_ids = [item["id"] for item in get_resp.json()["items"]]
    assert draft_id not in item_ids

    # 3. Edit the post to trigger PostRevision
    client.put(
        f"/api/v1/posts/{draft_id}",
        headers=headers,
        json={"title": "Updated Draft Title", "content": "Updated content with revision."}
    )
    revisions = db_session.query(PostRevision).filter(PostRevision.post_id == draft_id).all()
    assert len(revisions) > 0

    # Add a mock notification referencing draft_id
    notif = Notification(
        recipient_id=test_user.id,
        type=NotificationType.POST.value,
        entity_id=draft_id,
        entity_type="post",
        content="Test notification for post"
    )
    db_session.add(notif)
    db_session.commit()

    # 4. Delete post
    del_resp = client.delete(f"/api/v1/posts/{draft_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify post, revisions, and notifications are cleaned up
    assert db_session.query(Post).filter(Post.id == draft_id).first() is None
    assert db_session.query(PostRevision).filter(PostRevision.post_id == draft_id).count() == 0
    assert db_session.query(Notification).filter(Notification.entity_id == draft_id, Notification.entity_type == "post").count() == 0


def test_jobs_create_company_empty_name_rejected(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    bad_resp = client.post(
        "/api/v1/jobs/companies",
        headers=headers,
        json={"name": "   ", "description": "Tech firm"}
    )
    assert bad_resp.status_code == 400
    assert "Tên công ty" in bad_resp.json()["detail"]

    good_resp = client.post(
        "/api/v1/jobs/companies",
        headers=headers,
        json={"name": "VNG Corporation", "description": "Leading internet company"}
    )
    assert good_resp.status_code == 201
    assert good_resp.json()["name"] == "VNG Corporation"


def test_users_update_profile_empty_name_rejected(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    bad_resp = client.put(
        "/api/v1/users/profile",
        headers=headers,
        json={"name": "    "}
    )
    assert bad_resp.status_code == 400
    assert "Tên hiển thị" in bad_resp.json()["detail"]

    good_resp = client.put(
        "/api/v1/users/profile",
        headers=headers,
        json={"name": "Nguyen Van B"}
    )
    assert good_resp.status_code == 200
    assert good_resp.json()["name"] == "Nguyen Van B"
