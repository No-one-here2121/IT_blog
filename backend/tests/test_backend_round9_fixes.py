from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.post import Post, PostStatus
from app.models.user import User
from app.models.course import Course, CourseLesson
from app.models.company_job import Company, JobPost, JobApplication
from app.models.event import Event, EventRegistration
from app.models.ads import Ad


def test_post_status_validation_and_draft_protection(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Invalid status on create post
    res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Invalid Status Post",
        "content": "Valid content for testing post status validation.",
        "status": "nonexistent_status_123"
    })
    assert res.status_code == 400
    assert "Trạng thái" in res.json()["detail"]

    # 2. Create a valid draft post
    create_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Author Secret Draft Round 9",
        "content": "Secret content that should not be visible to public or shareable.",
        "status": "draft"
    })
    assert create_res.status_code == 201
    draft_id = create_res.json()["id"]

    # 3. Invalid status on update post
    update_res = client.put(f"/api/v1/posts/{draft_id}", headers=headers, json={
        "status": "unknown_status"
    })
    assert update_res.status_code == 400

    # 4. Attempt to share draft post (should fail with 404)
    share_res = client.post(f"/api/v1/posts/{draft_id}/share")
    assert share_res.status_code == 404

    # 5. Anonymous visitor cannot view revisions of draft post
    rev_anon = client.get(f"/api/v1/posts/{draft_id}/revisions")
    assert rev_anon.status_code == 404

    # Author CAN view revisions of their own draft post
    rev_author = client.get(f"/api/v1/posts/{draft_id}/revisions", headers=headers)
    assert rev_author.status_code == 200

    # 6. Anonymous visitor cannot get videos of draft post or nonexistent post
    videos_anon = client.get(f"/api/v1/posts/{draft_id}/videos")
    assert videos_anon.status_code == 404
    videos_404 = client.get("/api/v1/posts/999999/videos")
    assert videos_404.status_code == 404

    # Author CAN get videos of their draft post
    videos_author = client.get(f"/api/v1/posts/{draft_id}/videos", headers=headers)
    assert videos_author.status_code == 200


def test_bot_comment_deduplication_and_protection(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Register other user
    other_reg = client.post("/api/v1/auth/register", json={
        "email": "other_bot_tester@example.com",
        "username": "other_bot_tester",
        "name": "Other Bot Tester",
        "password": "Password123"
    })
    other_token = other_reg.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Create draft post as test_user
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Draft for Bot Test",
        "content": "Draft content for bot test discussion.",
        "status": "draft"
    })
    post_id = post_res.json()["id"]

    # Other user cannot trigger bot comment on draft post
    other_bot = client.post(f"/api/v1/posts/{post_id}/bot-comment", headers=other_headers)
    assert other_bot.status_code == 404

    # Author CAN trigger bot comment
    author_bot = client.post(f"/api/v1/posts/{post_id}/bot-comment", headers=headers)
    assert author_bot.status_code == 200
    first_comment_id = author_bot.json()["comment_id"]

    # Triggering again returns existing bot comment rather than duplicating
    second_bot = client.post(f"/api/v1/posts/{post_id}/bot-comment", headers=headers)
    assert second_bot.status_code == 200
    assert second_bot.json()["comment_id"] == first_comment_id


def test_course_detail_permissions_and_create_validation(client: TestClient, test_user_token: str, db_session: Session):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create course validation: empty title
    empty_title = client.post("/api/v1/courses", headers=headers, json={
        "title": "   ",
        "description": "Some description",
        "level": "beginner"
    })
    assert empty_title.status_code == 400
    assert "Tiêu đề" in empty_title.json()["detail"]

    # 2. Create course validation: invalid category_id
    bad_cat = client.post("/api/v1/courses", headers=headers, json={
        "title": "Course with Invalid Category",
        "description": "Some description",
        "category_id": 999999,
        "level": "beginner"
    })
    assert bad_cat.status_code == 400
    assert "Chuyên mục" in bad_cat.json()["detail"]

    # 3. Create draft course directly in DB
    draft_course = Course(
        title="Draft Microservices Course",
        slug="draft-microservices-course",
        description="Course under active development",
        level="advanced",
        status="draft",
        instructor_id=1
    )
    db_session.add(draft_course)
    db_session.commit()
    db_session.refresh(draft_course)
    course_id = draft_course.id

    # Anonymous user gets 404
    anon_res = client.get(f"/api/v1/courses/{course_id}")
    assert anon_res.status_code == 404

    # Instructor (user_id=1) CAN view it
    inst_res = client.get(f"/api/v1/courses/{course_id}", headers=headers)
    assert inst_res.status_code == 200
    assert inst_res.json()["title"] == "Draft Microservices Course"


def test_job_create_validation_and_delete_cascade(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Job create validation: empty title
    res_title = client.post("/api/v1/jobs", headers=headers, json={
        "company_name": "Test Co",
        "title": "   ",
        "location": "Hanoi",
        "description": "Valid job description"
    })
    assert res_title.status_code == 400

    # 2. Job create validation: empty description
    res_desc = client.post("/api/v1/jobs", headers=headers, json={
        "company_name": "Test Co",
        "title": "DevOps Engineer",
        "location": "Hanoi",
        "description": "   "
    })
    assert res_desc.status_code == 400

    # 3. Job create validation: empty location
    res_loc = client.post("/api/v1/jobs", headers=headers, json={
        "company_name": "Test Co",
        "title": "DevOps Engineer",
        "location": "   ",
        "description": "Valid job description"
    })
    assert res_loc.status_code == 400

    # 4. Create valid job
    create_job_res = client.post("/api/v1/jobs", headers=headers, json={
        "company_name": "Valid Co Round 9",
        "title": "Golang Backend Developer",
        "location": "Ho Chi Minh City",
        "description": "We need an awesome Go dev."
    })
    assert create_job_res.status_code == 201
    job_id = create_job_res.json()["id"]

    # 5. Apply with empty full_name
    bad_apply = client.post(f"/api/v1/jobs/{job_id}/apply", headers=headers, json={
        "full_name": "   ",
        "email": "dev@example.com"
    })
    # Since current_user has a name, it falls back to current_user.name; if both empty:
    # Let's test with empty email
    bad_email = client.post(f"/api/v1/jobs/{job_id}/apply", headers=headers, json={
        "full_name": "Applicant",
        "email": "   "
    })
    assert bad_email.status_code == 400

    # Valid apply
    valid_apply = client.post(f"/api/v1/jobs/{job_id}/apply", headers=headers, json={
        "full_name": "Golang Dev",
        "email": "godev@example.com"
    })
    assert valid_apply.status_code == 201

    # Delete job and verify cascade
    del_res = client.delete(f"/api/v1/jobs/{job_id}", headers=headers)
    assert del_res.status_code == 204
    assert client.get(f"/api/v1/jobs/{job_id}").status_code == 404


def test_event_create_validation_and_registration_validation(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Event create validation: empty description
    res_desc = client.post("/api/v1/events", headers=headers, json={
        "title": "Tech Conference 2026",
        "description": "   ",
        "organizer": "Tech Community",
        "start_time": "2026-11-20T09:00:00Z"
    })
    assert res_desc.status_code == 400

    # 2. Event create validation: empty organizer
    res_org = client.post("/api/v1/events", headers=headers, json={
        "title": "Tech Conference 2026",
        "description": "Valid description",
        "organizer": "   ",
        "start_time": "2026-11-20T09:00:00Z"
    })
    assert res_org.status_code == 400

    # 3. Create valid event
    ev_res = client.post("/api/v1/events", headers=headers, json={
        "title": "AI & Rust Meetup 2026",
        "description": "Deep dive into Rust and LLM inference.",
        "organizer": "Rust Vietnam",
        "start_time": "2026-11-25T14:00:00Z"
    })
    assert ev_res.status_code == 201
    ev_id = ev_res.json()["id"]

    # 4. Register for event with empty email
    bad_reg = client.post(f"/api/v1/events/{ev_id}/register", headers=headers, json={
        "full_name": "Attendee Name",
        "email": "   "
    })
    assert bad_reg.status_code == 400


def test_ads_update_status_validation(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    ad_res = client.post("/api/v1/ads", headers=headers, json={
        "title": "Cloud VPS Discount",
        "description": "50% off VPS for developers",
        "creative_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
        "target_url": "https://vps.example.com",
        "category": "cloud"
    })
    assert ad_res.status_code == 201
    ad_id = ad_res.json()["id"]

    # Update with invalid status
    bad_status = client.put(f"/api/v1/ads/{ad_id}/status", headers=headers, json={
        "status": "bogus_status"
    })
    assert bad_status.status_code == 400
    assert "Trạng thái" in bad_status.json()["detail"]

    # Update with valid status
    ok_status = client.put(f"/api/v1/ads/{ad_id}/status", headers=headers, json={
        "status": "paused"
    })
    assert ok_status.status_code == 200
    assert ok_status.json()["status"] == "paused"


def test_inactive_user_hidden_from_public_profile_and_reputation(client: TestClient, db_session: Session):
    # Register user and then deactivate
    reg = client.post("/api/v1/auth/register", json={
        "email": "banned_user_round9@example.com",
        "username": "banned_user_round9",
        "name": "Banned User",
        "password": "Password123"
    })
    assert reg.status_code == 201
    user_id = reg.json()["user"]["id"]

    # Deactivate directly in DB
    u = db_session.query(User).filter(User.id == user_id).first()
    u.is_active = False
    db_session.commit()

    # Query public profile at /users/{id} -> 404
    prof_res = client.get(f"/api/v1/users/{user_id}")
    assert prof_res.status_code == 404

    # Query public profile by username -> 404
    prof_uname = client.get("/api/v1/users/banned_user_round9")
    assert prof_uname.status_code == 404

    # Query reputation at /gamification/users/{id}/reputation -> 404
    rep_res = client.get(f"/api/v1/gamification/users/{user_id}/reputation")
    assert rep_res.status_code == 404


def test_auth_empty_name_and_empty_login_credentials(client: TestClient):
    # Register with whitespace name
    reg_empty_name = client.post("/api/v1/auth/register", json={
        "email": "empty_name_round9@example.com",
        "username": "empty_name_r9",
        "name": "   ",
        "password": "Password123"
    })
    assert reg_empty_name.status_code == 400
    assert "Họ và tên" in reg_empty_name.json()["detail"]

    # Login with empty identifier
    login_empty_id = client.post("/api/v1/auth/login", json={
        "identifier": "   ",
        "password": "Password123"
    })
    assert login_empty_id.status_code == 400

    # Login with empty password
    login_empty_pwd = client.post("/api/v1/auth/login", json={
        "identifier": "some_user",
        "password": "   "
    })
    assert login_empty_pwd.status_code == 400


def test_ai_ask_and_summarize_permissions_on_draft(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Register other user
    other_reg = client.post("/api/v1/auth/register", json={
        "email": "other_ai_tester@example.com",
        "username": "other_ai_tester",
        "name": "Other AI Tester",
        "password": "Password123"
    })
    other_token = other_reg.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Create draft post as test_user
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Draft Article for AI Protection",
        "content": "Secret draft content that shouldn't be asked or summarized by other visitors.",
        "status": "draft"
    })
    post_id = post_res.json()["id"]

    # Anonymous user cannot summarize draft post
    anon_sum = client.post("/api/v1/ai/summarize", json={"post_id": post_id})
    assert anon_sum.status_code == 404

    # Other user cannot summarize draft post
    other_sum = client.post("/api/v1/ai/summarize", headers=other_headers, json={"post_id": post_id})
    assert other_sum.status_code == 404

    # Other user cannot ask article about draft post
    other_ask = client.post("/api/v1/ai/ask-article", headers=other_headers, json={
        "post_id": post_id,
        "question": "What is the secret?"
    })
    assert other_ask.status_code == 404

    # Author CAN summarize their own draft post
    author_sum = client.post("/api/v1/ai/summarize", headers=headers, json={"post_id": post_id})
    assert author_sum.status_code == 200

    # Author CAN ask article about their own draft post
    author_ask = client.post("/api/v1/ai/ask-article", headers=headers, json={
        "post_id": post_id,
        "question": "Explain this draft concept"
    })
    assert author_ask.status_code == 200
