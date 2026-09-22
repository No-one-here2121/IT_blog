from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.post import Post, PostStatus
from app.models.user import User, Role
from app.models.category import Category
from app.models.crawler import CrawlSource
from app.core.security import get_password_hash, create_access_token, create_reset_token


def test_posts_status_filter_authorization(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers_author = {"Authorization": f"Bearer {test_user_token}"}

    # Author creates a draft post
    res_draft = client.post("/api/v1/posts", headers=headers_author, json={
        "title": "Author Secret Draft Round 11",
        "content": "Secret draft content",
        "status": "draft"
    })
    assert res_draft.status_code == 201
    draft_id = res_draft.json()["id"]

    # 1. Anonymous user attempts to query draft posts via status_filter=draft
    res_anon = client.get("/api/v1/posts?status_filter=draft")
    assert res_anon.status_code == 200
    # Must NOT leak draft post to anonymous user
    assert not any(p["id"] == draft_id for p in res_anon.json()["items"])

    # 2. Another normal user attempts to query draft posts
    other_user = User(
        email="other_round11@example.com",
        username="other_round11",
        name="Other User Round 11",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)
    other_token = create_access_token(subject=other_user.id)
    headers_other = {"Authorization": f"Bearer {other_token}"}

    res_other = client.get("/api/v1/posts?status_filter=draft", headers=headers_other)
    assert res_other.status_code == 200
    assert not any(p["id"] == draft_id for p in res_other.json()["items"])

    # 3. Author queries their own draft posts
    res_author = client.get(
        f"/api/v1/posts?author_id={test_user.id}&status_filter=draft",
        headers=headers_author
    )
    assert res_author.status_code == 200
    assert any(p["id"] == draft_id for p in res_author.json()["items"])


def test_course_creation_validation(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Empty description
    res_no_desc = client.post("/api/v1/courses", headers=headers, json={
        "title": "Complete Golang 2026",
        "description": "    ",
        "level": "beginner"
    })
    assert res_no_desc.status_code == 400
    assert "Mô tả khóa học" in res_no_desc.json()["detail"]

    # 2. Invalid level
    res_bad_level = client.post("/api/v1/courses", headers=headers, json={
        "title": "Complete Golang 2026",
        "description": "Học Golang từ cơ bản đến nâng cao",
        "level": "super_master"
    })
    assert res_bad_level.status_code == 400
    assert "Cấp độ khóa học" in res_bad_level.json()["detail"]

    # 3. Lesson with empty title
    res_bad_lesson = client.post("/api/v1/courses", headers=headers, json={
        "title": "Complete Golang 2026",
        "description": "Học Golang từ cơ bản đến nâng cao",
        "level": "intermediate",
        "lessons": [
            {"title": "   ", "content": "Bài học đầu tiên"}
        ]
    })
    assert res_bad_lesson.status_code == 400
    assert "Tiêu đề bài học" in res_bad_lesson.json()["detail"]

    # 4. Valid course creation
    res_valid = client.post("/api/v1/courses", headers=headers, json={
        "title": "Complete Golang 2026",
        "description": "Học Golang từ cơ bản đến nâng cao",
        "level": "intermediate",
        "lessons": [
            {"title": "Cài đặt Golang và Go Modules", "content": "Hướng dẫn cài đặt"}
        ]
    })
    assert res_valid.status_code == 201
    assert res_valid.json()["title"] == "Complete Golang 2026"
    assert len(res_valid.json()["lessons"]) == 1


def test_roadmap_creation_validation(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Invalid level
    res_bad_level = client.post("/api/v1/roadmaps", headers=headers, json={
        "title": "DevOps Engineer Roadmap 2026",
        "description": "Lộ trình chi tiết",
        "level": "guru"
    })
    assert res_bad_level.status_code == 400
    assert "Cấp độ lộ trình" in res_bad_level.json()["detail"]

    # 2. Step with empty title
    res_bad_step = client.post("/api/v1/roadmaps", headers=headers, json={
        "title": "DevOps Engineer Roadmap 2026",
        "description": "Lộ trình chi tiết",
        "level": "basic",
        "steps": [
            {"title": "   ", "description": "Linux Shell scripting"}
        ]
    })
    assert res_bad_step.status_code == 400
    assert "Tiêu đề bước học" in res_bad_step.json()["detail"]

    # 3. Valid roadmap
    res_valid = client.post("/api/v1/roadmaps", headers=headers, json={
        "title": "DevOps Engineer Roadmap 2026",
        "description": "Lộ trình chi tiết",
        "level": "intermediate",
        "steps": [
            {"title": "Học Linux & Bash Shell", "description": "Lệnh cơ bản"}
        ]
    })
    assert res_valid.status_code == 201
    assert res_valid.json()["total_steps"] == 1


def test_event_creation_validation(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Invalid event_type
    res_bad_type = client.post("/api/v1/events", headers=headers, json={
        "title": "AWS Cloud Day Vietnam 2026",
        "description": "Sự kiện điện toán đám mây lớn nhất năm.",
        "organizer": "AWS User Group",
        "event_type": "invalid_festival",
        "start_time": "2026-11-20T09:00:00Z"
    })
    assert res_bad_type.status_code == 400
    assert "Loại sự kiện không hợp lệ" in res_bad_type.json()["detail"]

    # 2. Valid event
    res_valid = client.post("/api/v1/events", headers=headers, json={
        "title": "AWS Cloud Day Vietnam 2026",
        "description": "Sự kiện điện toán đám mây lớn nhất năm.",
        "organizer": "AWS User Group",
        "event_type": "conference",
        "start_time": "2026-11-20T09:00:00Z"
    })
    assert res_valid.status_code == 201
    assert res_valid.json()["event_type"] == "conference"


def test_job_creation_blank_company_name(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Blank company_name
    res_blank_comp = client.post("/api/v1/jobs", headers=headers, json={
        "title": "Senior Python Backend Engineer",
        "description": "Xây dựng hệ thống phân tán microservices",
        "location": "Hà Nội",
        "company_name": "    "
    })
    assert res_blank_comp.status_code == 400
    assert "cung cấp tên công ty" in res_blank_comp.json()["detail"].lower()

    # 2. Valid company_name
    res_valid = client.post("/api/v1/jobs", headers=headers, json={
        "title": "Senior Python Backend Engineer",
        "description": "Xây dựng hệ thống phân tán microservices",
        "location": "Hà Nội",
        "company_name": "VNG Corporation"
    })
    assert res_valid.status_code == 201
    assert res_valid.json()["title"] == "Senior Python Backend Engineer"


def test_category_slug_and_case_insensitive_duplicate(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    # Ensure admin role
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if admin_role not in test_user.roles:
        test_user.roles.append(admin_role)
        db_session.commit()

    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create category with custom slug
    res_cat1 = client.post("/api/v1/categories", headers=headers, json={
        "name": "Microservices",
        "slug": "  MICROSERVICES-VN  ",
        "description": "Kiến trúc microservices"
    })
    assert res_cat1.status_code == 201
    assert res_cat1.json()["slug"] == "microservices-vn"

    # 2. Attempt duplicate category differing only by case
    res_dup = client.post("/api/v1/categories", headers=headers, json={
        "name": "microservices",
        "description": "Duplicate category test"
    })
    assert res_dup.status_code == 400
    assert "đã tồn tại" in res_dup.json()["detail"].lower()


def test_quiz_options_and_difficulty_validation(
    client: TestClient
):
    # 1. Options with empty/blank strings
    res_empty_opts = client.post("/api/v1/quiz/questions", json={
        "question": "Tính năng nào có trong Python 3.12?",
        "options": ["Subinterpreters", "   ", ""],
        "answer_index": 0
    })
    assert res_empty_opts.status_code == 400
    assert "ít nhất 2 phương án" in res_empty_opts.json()["detail"]

    # 2. Invalid difficulty
    res_bad_diff = client.post("/api/v1/quiz/questions", json={
        "question": "Tính năng nào có trong Python 3.12?",
        "options": ["Subinterpreters", "GIL removal"],
        "answer_index": 0,
        "difficulty": "extreme_impossible"
    })
    assert res_bad_diff.status_code == 400
    assert "Độ khó câu hỏi" in res_bad_diff.json()["detail"]

    # 3. Valid question
    res_valid = client.post("/api/v1/quiz/questions", json={
        "question": "Tính năng nào có trong Python 3.12?",
        "options": ["Subinterpreters (PEP 684)", "Loại bỏ hoàn toàn GIL"],
        "answer_index": 0,
        "difficulty": "hard"
    })
    assert res_valid.status_code == 201
    assert res_valid.json()["ok"] is True


def test_analytics_interaction_count_filters_drafts(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Initial overview
    res_init = client.get("/api/v1/analytics/overview")
    assert res_init.status_code == 200
    init_likes = res_init.json()["total_interactions"]

    # Create published post and like it
    res_pub = client.post("/api/v1/posts", headers=headers, json={
        "title": "Published Post for Analytics Test",
        "content": "Published content",
        "status": "approved"
    })
    assert res_pub.status_code == 201
    pub_id = res_pub.json()["id"]
    client.post(f"/api/v1/posts/{pub_id}/like", headers=headers)

    # Interactions should increase
    res_after = client.get("/api/v1/analytics/overview")
    assert res_after.status_code == 200
    assert res_after.json()["total_interactions"] > init_likes

    # Unpublish the post (set to draft)
    post_obj = db_session.query(Post).filter(Post.id == pub_id).first()
    post_obj.status = PostStatus.DRAFT.value
    db_session.commit()

    # The draft post's like should NO LONGER be counted in total_interactions
    res_after_draft = client.get("/api/v1/analytics/overview")
    assert res_after_draft.status_code == 200
    assert res_after_draft.json()["total_interactions"] == init_likes


def test_crawler_source_type_and_duplicate_url(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Invalid source_type
    res_bad_type = client.post("/api/v1/crawler/sources", headers=headers, json={
        "name": "Invalid Source",
        "url": "https://example.com/feed.xml",
        "source_type": "malware_script"
    })
    assert res_bad_type.status_code == 400
    assert "Loại nguồn cào tin" in res_bad_type.json()["detail"]

    # 2. Valid source
    res_valid = client.post("/api/v1/crawler/sources", headers=headers, json={
        "name": "Dev.to Tech Feed",
        "url": "https://dev.to/feed",
        "source_type": "rss"
    })
    assert res_valid.status_code == 201

    # 3. Duplicate source URL
    res_dup = client.post("/api/v1/crawler/sources", headers=headers, json={
        "name": "Duplicate Dev.to",
        "url": "https://dev.to/feed",
        "source_type": "rss"
    })
    assert res_dup.status_code == 400
    assert "đã tồn tại" in res_dup.json()["detail"].lower()


def test_auth_password_whitespace_rejection(
    client: TestClient,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Change password with 6 spaces
    res_change_space = client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "Password123!",
        "new_password": "      "
    })
    assert res_change_space.status_code == 400
    assert "ít nhất 6 ký tự" in res_change_space.json()["detail"].lower()

    # 2. Reset password with 6 spaces
    reset_token = create_reset_token(subject=test_user.id)
    res_reset_space = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "      "
    })
    assert res_reset_space.status_code == 400
    assert "ít nhất 6 ký tự" in res_reset_space.json()["detail"].lower()
