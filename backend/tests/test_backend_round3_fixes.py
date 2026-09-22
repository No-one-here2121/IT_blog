import pytest
from app.models.user import User, Role
from app.models.post import Post
from app.models.comment import Comment
from app.models.course import Course, CourseLesson, CourseEnrollment, CourseLessonProgress
from app.models.roadmap import Roadmap, RoadmapStep, UserRoadmapProgress
from app.models.event import Event, EventRegistration
from app.models.company_job import Company, JobPost, JobApplication
from app.core.security import get_password_hash


def test_rate_limiter_options_preflight(client):
    """
    Test that OPTIONS requests (CORS preflights) pass through immediately
    and are not blocked by the RateLimitMiddleware.
    """
    resp = client.options("/api/v1/posts")
    # OPTIONS should return 200 OK or appropriate status without 429
    assert resp.status_code != 429


def test_users_me_endpoint_and_avatar_update(client):
    """
    Test GET /api/v1/users/me returns authenticated user profile,
    and updating profile with empty string does not wipe avatar.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "user_me_test@example.com",
        "username": "user_me_test",
        "name": "User Me Tester",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET /api/v1/users/me
    me_res = client.get("/api/v1/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "user_me_test"
    original_avatar = me_res.json()["avatar"]
    assert original_avatar is not None

    # 2. PUT /api/v1/users/profile with empty avatar string - should keep existing avatar
    update_res = client.put("/api/v1/users/profile", headers=headers, json={
        "name": "User Me Updated",
        "avatar": "   ",
        "bio": "Senior DevOps Engineer"
    })
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "User Me Updated"
    assert update_res.json()["bio"] == "Senior DevOps Engineer"
    assert update_res.json()["avatar"] == original_avatar


def test_jobs_applications_me_and_delete_job(client):
    """
    Test GET /api/v1/jobs/applications/me route ordering
    and DELETE /api/v1/jobs/{id}.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "job_user@example.com",
        "username": "job_user",
        "name": "Job User",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create job
    job_res = client.post("/api/v1/jobs", headers=headers, json={
        "company_name": "Round3 Tech",
        "title": "Fullstack Cloud Engineer",
        "location": "Đà Nẵng",
        "work_type": "hybrid",
        "salary_range": "35 - 55M",
        "description": "Building cloud native systems."
    })
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # Apply for job
    app_res = client.post(f"/api/v1/jobs/{job_id}/apply", headers=headers, json={
        "full_name": "Job User",
        "email": "job_user@example.com",
        "resume_url": "https://example.com/cv.pdf"
    })
    assert app_res.status_code == 201

    # Get my applications (must route cleanly without 422)
    my_apps = client.get("/api/v1/jobs/applications/me", headers=headers)
    assert my_apps.status_code == 200
    assert len(my_apps.json()) >= 1
    assert any(a["job_post_id"] == job_id for a in my_apps.json())

    # Delete job
    del_res = client.delete(f"/api/v1/jobs/{job_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify 404 after deletion
    get_res = client.get(f"/api/v1/jobs/{job_id}")
    assert get_res.status_code == 404


def test_course_completion_toggle_and_delete_course(client):
    """
    Test that when all lessons are completed, enrollment status becomes 'completed'.
    When a lesson is uncompleted, enrollment status properly reverts to 'enrolled'.
    Also tests DELETE /api/v1/courses/{id}.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "instructor_round3@example.com",
        "username": "instructor_round3",
        "name": "Instructor Round 3",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create course with 2 lessons
    course_res = client.post("/api/v1/courses", headers=headers, json={
        "title": "Lập trình Rust và WebAssembly",
        "description": "Khóa học Rust hiệu năng cao.",
        "level": "intermediate",
        "lessons": [
            {"title": "Bài 1: Cú pháp và Ownership", "content": "Nội dung bài 1"},
            {"title": "Bài 2: Concurrency & Async", "content": "Nội dung bài 2"}
        ]
    })
    assert course_res.status_code == 201
    course_data = course_res.json()
    course_id = course_data["id"]
    lesson_ids = [l["id"] for l in course_data["lessons"]]
    assert len(lesson_ids) == 2

    # Enroll
    enroll_res = client.post(f"/api/v1/courses/{course_id}/enroll", headers=headers)
    assert enroll_res.status_code == 201

    # Complete lesson 1
    t1 = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_ids[0]}/complete", headers=headers)
    assert t1.status_code == 200
    assert t1.json()["completed_lessons"] == 1

    # Check course detail - still enrolled
    det1 = client.get(f"/api/v1/courses/{course_id}", headers=headers)
    assert det1.status_code == 200
    assert det1.json()["completed_lessons"] == 1

    # Complete lesson 2 - now all completed
    t2 = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_ids[1]}/complete", headers=headers)
    assert t2.status_code == 200
    assert t2.json()["completed_lessons"] == 2
    assert t2.json()["progress_percent"] == 100.0

    # Uncomplete lesson 2 - should revert status to 'enrolled'
    t2_undo = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_ids[1]}/complete", headers=headers)
    assert t2_undo.status_code == 200
    assert t2_undo.json()["completed_lessons"] == 1
    assert t2_undo.json()["is_completed"] is False

    # Delete course
    del_res = client.delete(f"/api/v1/courses/{course_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify 404 after deletion
    get_res = client.get(f"/api/v1/courses/{course_id}")
    assert get_res.status_code == 404


def test_crawler_duplicate_slug_batch_safety(client):
    """
    Test that triggering a crawl with default feeds or duplicate items
    does not throw 500 or UNIQUE constraint error.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "crawler_round3@example.com",
        "username": "crawler_round3",
        "name": "Crawler Tester",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Run crawl once
    crawl1 = client.post("/api/v1/crawler/trigger", headers=headers, json={"auto_publish": True})
    assert crawl1.status_code == 200
    assert crawl1.json()["job"]["status"] == "success"

    # Run crawl a second time immediately (all items already exist as duplicates)
    crawl2 = client.post("/api/v1/crawler/trigger", headers=headers, json={"auto_publish": True})
    assert crawl2.status_code == 200
    assert crawl2.json()["job"]["status"] == "success"
    # Should safely skip existing items without crash
    assert crawl2.json()["job"]["items_saved"] == 0


def test_delete_post_with_nested_threaded_comments(client):
    """
    Test creating a post with threaded comments (parent and child reply)
    and deleting the post, ensuring parent_id foreign key constraint is handled cleanly.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "nested_author@example.com",
        "username": "nested_author",
        "name": "Nested Author",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Post With Deep Nested Comments",
        "content": "This post will test nested comment deletion cascade safety.",
        "status": "approved"
    })
    assert post_res.status_code == 201
    post_id = post_res.json()["id"]

    # Create root comment
    c1_res = client.post(f"/api/v1/posts/{post_id}/comments", headers=headers, json={
        "content": "Root level question."
    })
    assert c1_res.status_code == 201
    c1_id = c1_res.json()["id"]

    # Create reply comment (pointing to c1)
    c2_res = client.post(f"/api/v1/posts/{post_id}/comments", headers=headers, json={
        "content": "Child level reply to question.",
        "parent_id": c1_id
    })
    assert c2_res.status_code == 201
    c2_id = c2_res.json()["id"]

    # Like the comments
    client.post(f"/api/v1/comments/{c1_id}/like", headers=headers)
    client.post(f"/api/v1/comments/{c2_id}/like", headers=headers)

    # Delete post - should cascade without foreign key error
    del_res = client.delete(f"/api/v1/posts/{post_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify post is gone
    check_res = client.get(f"/api/v1/posts/{post_id}")
    assert check_res.status_code == 404


def test_auth_change_password_reject_identical_password(client):
    """
    Test that changing password to the exact same old password is rejected with HTTP 400.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "change_pass_user@example.com",
        "username": "change_pass_user",
        "name": "Change Pass User",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to change to identical password
    same_res = client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "Password123",
        "new_password": "Password123"
    })
    assert same_res.status_code == 400
    assert "trùng" in same_res.json()["detail"].lower()

    # Change to a different valid password
    valid_res = client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "Password123",
        "new_password": "NewSecretPassword456"
    })
    assert valid_res.status_code == 200


def test_roadmap_delete_and_cascade(client):
    """
    Test creating a roadmap with steps, toggling progress, and deleting the roadmap.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "roadmap_dev@example.com",
        "username": "roadmap_dev",
        "name": "Roadmap Dev",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create roadmap
    rm_res = client.post("/api/v1/roadmaps", headers=headers, json={
        "title": "Lộ trình Kỹ sư Hệ thống 2026",
        "description": "Từ Linux, Docker, K8s đến Observability.",
        "level": "intermediate",
        "steps": [
            {"title": "Linux Internals", "description": "Kernel and Syscalls"},
            {"title": "Container Runtime", "description": "cgroups and namespaces"}
        ]
    })
    assert rm_res.status_code == 201
    rm_id = rm_res.json()["id"]
    step_id = rm_res.json()["steps"][0]["id"]

    # Toggle step
    toggle_res = client.post(f"/api/v1/roadmaps/{rm_id}/steps/{step_id}/toggle", headers=headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_completed"] is True

    # Delete roadmap
    del_res = client.delete(f"/api/v1/roadmaps/{rm_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify 404
    get_res = client.get(f"/api/v1/roadmaps/{rm_id}")
    assert get_res.status_code == 404


def test_event_delete_and_cascade(client):
    """
    Test creating an event, registering for it, and deleting the event with registrations cleanup.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "event_host@example.com",
        "username": "event_host",
        "name": "Event Host Organizer",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create event
    ev_res = client.post("/api/v1/events", headers=headers, json={
        "title": "Vietnam DevFest AI & Cloud 2026",
        "description": "Ngày hội công nghệ thường niên.",
        "organizer": "Event Host Organizer",
        "event_type": "conference",
        "start_time": "2026-12-01T09:00:00Z"
    })
    assert ev_res.status_code == 201
    ev_id = ev_res.json()["id"]

    # Register for event
    r_res = client.post(f"/api/v1/events/{ev_id}/register", headers=headers, json={
        "full_name": "Attendee One",
        "email": "attendee1@example.com"
    })
    assert r_res.status_code == 201

    # Delete event
    del_res = client.delete(f"/api/v1/events/{ev_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify 404
    get_res = client.get(f"/api/v1/events/{ev_id}")
    assert get_res.status_code == 404
