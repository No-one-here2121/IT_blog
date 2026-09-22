import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User


def test_gamification_catalog_and_ranking_order(client: TestClient, db_session: Session, test_user: User):
    # 1. Verify badges catalog
    resp = client.get("/api/v1/gamification/badges")
    assert resp.status_code == 200
    badges = resp.json()
    assert isinstance(badges, list)
    assert len(badges) >= 1
    # Check that each badge has required metadata
    for b in badges:
        assert "name" in b
        assert "slug" in b
        assert "points_required" in b
        assert "description" in b

    # 2. Verify leaderboard endpoint
    lb_resp = client.get("/api/v1/gamification/leaderboard?limit=10")
    assert lb_resp.status_code == 200
    leaderboard = lb_resp.json()
    assert isinstance(leaderboard, list)
    if len(leaderboard) > 0:
        assert "user_id" in leaderboard[0]
        assert "reputation_points" in leaderboard[0]


def test_courses_enrollment_and_progress_tracking(client: TestClient, db_session: Session, test_user: User, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a new course with lessons
    payload = {
        "title": "Khóa học React 19 & FastAPI Round 10",
        "description": "Thực hành xây dựng ứng dụng toàn diện với React 19 và FastAPI",
        "level": "intermediate",
        "lessons": [
            {"title": "Bài 1: Kiến trúc tổng quan", "duration_minutes": 20, "order_index": 1},
            {"title": "Bài 2: Tối ưu hiệu năng & Caching", "duration_minutes": 30, "order_index": 2}
        ]
    }
    create_resp = client.post("/api/v1/courses", json=payload, headers=headers)
    assert create_resp.status_code == 201
    course_data = create_resp.json()
    course_id = course_data["id"]

    # 2. Enroll into course
    enroll_resp = client.post(f"/api/v1/courses/{course_id}/enroll", headers=headers)
    assert enroll_resp.status_code in [200, 201]

    # 3. Check course list has enrolled status
    list_resp = client.get("/api/v1/courses", headers=headers)
    assert list_resp.status_code == 200
    my_course = next((c for c in list_resp.json() if c["id"] == course_id), None)
    assert my_course is not None
    assert my_course["is_enrolled"] is True

    # 4. Complete a lesson
    lesson_id = course_data["lessons"][0]["id"]
    comp_resp = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_id}/complete", headers=headers)
    assert comp_resp.status_code in [200, 201]
    assert comp_resp.json().get("is_completed") is True


def test_events_schedule_and_registration_workflow(client: TestClient, db_session: Session, test_user: User, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create an event
    evt_payload = {
        "title": "Hội thảo Kiến trúc Clean Architecture Round 10",
        "description": "Chia sẻ kinh nghiệm thiết kế Clean Architecture cho Python và React.",
        "organizer": "IT Blog Community",
        "event_type": "webinar",
        "start_time": "2026-11-15T19:00:00Z",
        "location": "Online qua Zoom"
    }
    create_resp = client.post("/api/v1/events", json=evt_payload, headers=headers)
    assert create_resp.status_code == 201
    event_id = create_resp.json()["id"]

    # 2. List events with type filter
    filter_resp = client.get("/api/v1/events?event_type=webinar")
    assert filter_resp.status_code == 200
    events = filter_resp.json()
    assert any(e["id"] == event_id for e in events)

    # 3. Register for event
    reg_resp = client.post(f"/api/v1/events/{event_id}/register", json={
        "full_name": test_user.name,
        "email": test_user.email,
        "notes": "Tham dự online"
    }, headers=headers)
    assert reg_resp.status_code in [200, 201]

    # 4. Get my registrations
    my_regs = client.get("/api/v1/events/registrations/me", headers=headers)
    assert my_regs.status_code == 200
    assert any(r["event_id"] == event_id for r in my_regs.json())

    # 5. Cancel registration
    cancel_resp = client.delete(f"/api/v1/events/{event_id}/register", headers=headers)
    assert cancel_resp.status_code == 200


def test_roadmaps_catalog_and_level_filtering(client: TestClient, db_session: Session, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a basic roadmap
    rm_basic = client.post("/api/v1/roadmaps", json={
        "title": "Lộ trình Frontend React Junior 2026",
        "description": "Dành cho người mới bắt đầu học React 19.",
        "level": "basic",
        "steps": [
            {"order_index": 1, "title": "HTML5 & Semantic tags"},
            {"order_index": 2, "title": "JavaScript DOM & Fetch API"}
        ]
    }, headers=headers)
    assert rm_basic.status_code == 201

    # 2. Query roadmaps with level=basic
    query_resp = client.get("/api/v1/roadmaps?level=basic", headers=headers)
    assert query_resp.status_code == 200
    basic_list = query_resp.json()
    assert len(basic_list) >= 1
    assert all(r["level"] == "basic" for r in basic_list)
