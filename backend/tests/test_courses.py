import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User


def test_courses_syllabus_and_progress(client: TestClient, test_user: User, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a course with lessons
    course_payload = {
        "title": "Khóa học FastAPI Masterclass 2026",
        "description": "Thành thạo xây dựng REST API & GraphQL chuẩn Enterprise với FastAPI, Pydantic v2 và PostgreSQL",
        "level": "intermediate",
        "lessons": [
            {
                "title": "Bài 1: Cài đặt và Kiến trúc Dependency Injection",
                "content": "Tổng quan về FastAPI deps và lifespan...",
                "duration_minutes": 20
            },
            {
                "title": "Bài 2: SQLAlchemy 2.0 Async Session & Caching Redis",
                "content": "Chi tiết kết nối asyncpg và cache-aside pattern...",
                "duration_minutes": 35
            }
        ]
    }
    create_resp = client.post("/api/v1/courses", json=course_payload, headers=headers)
    assert create_resp.status_code == 201
    course_data = create_resp.json()
    course_id = course_data["id"]
    slug = course_data["slug"]
    assert course_data["total_lessons"] == 2
    assert len(course_data["lessons"]) == 2
    lesson_1_id = course_data["lessons"][0]["id"]
    lesson_2_id = course_data["lessons"][1]["id"]

    # 2. List courses
    list_resp = client.get("/api/v1/courses?level=intermediate", headers=headers)
    assert list_resp.status_code == 200
    courses = list_resp.json()
    assert len(courses) >= 1
    assert courses[0]["total_lessons"] == 2

    # 3. Get course detail by slug
    detail_resp = client.get(f"/api/v1/courses/{slug}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == course_id

    # 4. Enroll into course
    enroll_resp = client.post(f"/api/v1/courses/{course_id}/enroll", headers=headers)
    assert enroll_resp.status_code == 201
    assert enroll_resp.json()["status"] == "enrolled"

    # 5. Complete Lesson 1
    comp1_resp = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_1_id}/complete", headers=headers)
    assert comp1_resp.status_code == 200
    comp1_data = comp1_resp.json()
    assert comp1_data["is_completed"] is True
    assert comp1_data["completed_lessons"] == 1
    assert comp1_data["progress_percent"] == 50.0

    # 6. Complete Lesson 2 -> Course 100% complete
    comp2_resp = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_2_id}/complete", headers=headers)
    assert comp2_resp.status_code == 200
    comp2_data = comp2_resp.json()
    assert comp2_data["is_completed"] is True
    assert comp2_data["completed_lessons"] == 2
    assert comp2_data["progress_percent"] == 100.0

    # Verify detail reflects 100% completion
    updated_detail = client.get(f"/api/v1/courses/{course_id}", headers=headers)
    assert updated_detail.status_code == 200
    assert updated_detail.json()["completed_lessons"] == 2
    assert updated_detail.json()["user_progress_percent"] == 100.0
