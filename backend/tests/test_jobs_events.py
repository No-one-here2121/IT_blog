from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User


def test_companies_and_job_board(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create company
    company_payload = {
        "name": "FPT Software AI Lab",
        "website": "https://fpt-software.com",
        "location": "Hà Nội, Việt Nam",
        "description": "Trung tâm nghiên cứu và triển khai ứng dụng AI tiên tiến",
        "tech_stack": "Python, PyTorch, FastAPI, React"
    }
    comp_resp = client.post("/api/v1/companies", json=company_payload, headers=headers)
    assert comp_resp.status_code == 201
    comp_data = comp_resp.json()
    assert comp_data["name"] == company_payload["name"]
    company_id = comp_data["id"]

    # 2. List companies
    comps_list = client.get("/api/v1/companies")
    assert comps_list.status_code == 200
    assert len(comps_list.json()) >= 1

    # 3. Create job posting
    job_payload = {
        "company_id": company_id,
        "title": "Senior Backend Developer (FastAPI / PostgreSQL)",
        "location": "Hà Nội",
        "work_type": "hybrid",
        "salary_range": "35M - 50M VND",
        "description": "Phát triển hệ thống microservices phục vụ hàng triệu người dùng",
        "requirements": "3+ năm kinh nghiệm với Python/FastAPI, tối ưu DB PostgreSQL",
        "skills": "Python, FastAPI, Docker, PostgreSQL, Redis",
        "application_url": "https://careers.fpt.com/apply"
    }
    job_resp = client.post("/api/v1/jobs", json=job_payload, headers=headers)
    assert job_resp.status_code == 201
    job_data = job_resp.json()
    job_id = job_data["id"]
    assert job_data["title"] == job_payload["title"]
    assert job_data["company"]["id"] == company_id

    # 4. Search and filter jobs
    filter_resp = client.get("/api/v1/jobs?skill=FastAPI&location=Hà Nội")
    assert filter_resp.status_code == 200
    jobs = filter_resp.json()
    assert len(jobs) >= 1
    assert jobs[0]["id"] == job_id

    # 5. Get job detail
    detail_resp = client.get(f"/api/v1/jobs/{job_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["salary_range"] == "35M - 50M VND"

    # 6. Section 45: Get detailed Company Profile with active jobs
    comp_detail_resp = client.get(f"/api/v1/companies/{company_id}")
    assert comp_detail_resp.status_code == 200
    comp_detail_data = comp_detail_resp.json()
    assert comp_detail_data["name"] == company_payload["name"]
    assert len(comp_detail_data["jobs"]) >= 1
    assert comp_detail_data["jobs"][0]["id"] == job_id

    # 7. Section 45: Follow company
    follow_comp_resp = client.post(f"/api/v1/companies/{company_id}/follow", headers=headers)
    assert follow_comp_resp.status_code == 200
    assert follow_comp_resp.json()["is_following"] is True


def test_events_and_workshops(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create event
    start_time = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    end_time = (datetime.now(timezone.utc) + timedelta(days=7, hours=3)).isoformat()

    event_payload = {
        "title": "Hội thảo Kiến trúc Clean Architecture với FastAPI 2026",
        "description": "Chia sẻ kinh nghiệm thiết kế Clean Architecture, DDD và triển khai CI/CD chuẩn Enterprise",
        "organizer": "Cộng đồng Python Việt Nam",
        "event_type": "webinar",
        "start_time": start_time,
        "end_time": end_time,
        "location": "Online via Zoom",
        "online_url": "https://zoom.us/j/123456789",
        "registration_url": "https://eventbrite.com/itblog-webinar"
    }
    event_resp = client.post("/api/v1/events", json=event_payload, headers=headers)
    assert event_resp.status_code == 201
    event_data = event_resp.json()
    event_id = event_data["id"]
    slug = event_data["slug"]
    assert event_data["title"] == event_payload["title"]
    assert event_data["status"] == "upcoming"

    # 2. List events
    list_resp = client.get("/api/v1/events?event_type=webinar&status=upcoming")
    assert list_resp.status_code == 200
    events = list_resp.json()
    assert len(events) >= 1
    assert events[0]["id"] == event_id

    # 3. Get event detail by slug
    detail_resp = client.get(f"/api/v1/events/{slug}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["organizer"] == "Cộng đồng Python Việt Nam"

    # 4. Register for event
    reg_payload = {
        "full_name": "Nguyễn Văn Dev",
        "email": "dev@itblog.vn",
        "notes": "Tham dự online"
    }
    reg_resp = client.post(f"/api/v1/events/{event_id}/register", json=reg_payload, headers=headers)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["event_id"] == event_id
    assert reg_data["full_name"] == reg_payload["full_name"]

    # 5. Get my registrations
    my_regs = client.get("/api/v1/events/registrations/me", headers=headers)
    assert my_regs.status_code == 200
    assert any(r["event_id"] == event_id for r in my_regs.json())

    # 6. Cancel event registration
    cancel_resp = client.delete(f"/api/v1/events/{event_id}/register", headers=headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["event_id"] == event_id

    # 7. Verify ticket cancelled
    my_regs_after = client.get("/api/v1/events/registrations/me", headers=headers)
    assert my_regs_after.status_code == 200
    assert not any(r["event_id"] == event_id for r in my_regs_after.json())
