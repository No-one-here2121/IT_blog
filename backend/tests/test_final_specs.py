from datetime import datetime, timezone
import pytest
from app.core.rate_limiter import SlidingWindowRateLimiter
from app.api.v1.crawler import parse_rss_feed


def test_auth_change_password(client):
    # Register user
    reg = client.post("/api/v1/auth/register", json={
        "email": "passchange@example.com",
        "username": "passchange",
        "name": "Pass Change",
        "password": "OldPassword123"
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Change password wrong old password
    res_wrong = client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "WrongPassword",
        "new_password": "NewPassword456"
    })
    assert res_wrong.status_code == 400

    # Change password successfully
    res_ok = client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "OldPassword123",
        "new_password": "NewPassword456"
    })
    assert res_ok.status_code == 200
    assert res_ok.json()["success"] is True

    # Login with new password
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "passchange",
        "password": "NewPassword456"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_auth_forgot_and_reset_password(client):
    # Register user
    reg = client.post("/api/v1/auth/register", json={
        "email": "forgot@example.com",
        "username": "forgotuser",
        "name": "Forgot User",
        "password": "InitialPassword123"
    })
    assert reg.status_code == 201

    # Request forgot password
    forgot_res = client.post("/api/v1/auth/forgot-password", json={
        "email": "forgot@example.com"
    })
    assert forgot_res.status_code == 200
    msg = forgot_res.json()["message"]
    assert "Token khôi phục mật khẩu" in msg
    reset_token = msg.split(": ")[1].strip()

    # Reset with invalid token
    bad_reset = client.post("/api/v1/auth/reset-password", json={
        "token": "invalid.jwt.token",
        "new_password": "BrandNewPassword789"
    })
    assert bad_reset.status_code == 400

    # Reset with valid token
    good_reset = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "BrandNewPassword789"
    })
    assert good_reset.status_code == 200

    # Verify login with new password
    login_res = client.post("/api/v1/auth/login", json={
        "identifier": "forgotuser",
        "password": "BrandNewPassword789"
    })
    assert login_res.status_code == 200


def test_post_revisions_and_shares(client):
    # Register author
    reg = client.post("/api/v1/auth/register", json={
        "email": "author_rev@example.com",
        "username": "author_rev",
        "name": "Author Revisions",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Initial Post Title For Revision Test",
        "content": "Initial post content body with detailed technical explanation.",
        "excerpt": "Initial excerpt",
        "status": "approved"
    })
    assert post_res.status_code == 201
    post_id = post_res.json()["id"]

    # Initially revisions should be empty
    revs_res1 = client.get(f"/api/v1/posts/{post_id}/revisions")
    assert revs_res1.status_code == 200
    assert len(revs_res1.json()) == 0

    # Edit post to trigger revision snapshot
    update_res = client.put(f"/api/v1/posts/{post_id}", headers=headers, json={
        "title": "Updated Post Title For Revision Test",
        "content": "Updated post content body with updated technical explanation.",
        "change_summary": "Cập nhật tiêu đề và bổ sung nội dung kỹ thuật"
    })
    assert update_res.status_code == 200

    # Check revisions
    revs_res2 = client.get(f"/api/v1/posts/{post_id}/revisions")
    assert revs_res2.status_code == 200
    revs = revs_res2.json()
    assert len(revs) == 1
    assert revs[0]["title"] == "Initial Post Title For Revision Test"
    assert "Initial post content" in revs[0]["content"]
    assert revs[0]["change_summary"] == "Cập nhật tiêu đề và bổ sung nội dung kỹ thuật"

    # Test share counter
    share_res1 = client.post(f"/api/v1/posts/{post_id}/share", headers=headers)
    assert share_res1.status_code == 200
    assert share_res1.json()["shares_count"] == 1
    assert "share_url" in share_res1.json()

    share_res2 = client.post(f"/api/v1/posts/{post_id}/share")
    assert share_res2.status_code == 200
    assert share_res2.json()["shares_count"] == 2


def test_job_application_lifecycle(client):
    # Register applicant
    reg = client.post("/api/v1/auth/register", json={
        "email": "applicant@example.com",
        "username": "applicant_dev",
        "name": "Applicant Dev",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create job post
    job_res = client.post("/api/v1/jobs", headers=headers, json={
        "company_name": "Tech Corp Vietnam",
        "title": "Senior Python FastAPI Developer",
        "location": "Hà Nội / Remote",
        "work_type": "remote",
        "salary_range": "30 - 50 Triệu VNĐ",
        "description": "Tuyển dụng kỹ sư Backend xây dựng hệ thống phân tán.",
        "skills": "Python, FastAPI, Docker, PostgreSQL"
    })
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # Submit job application
    app_res = client.post(f"/api/v1/jobs/{job_id}/apply", headers=headers, json={
        "full_name": "Nguyễn Văn Developer",
        "email": "applicant@example.com",
        "phone": "0987654321",
        "resume_url": "https://example.com/cv.pdf",
        "cover_letter": "Tôi có 4 năm kinh nghiệm làm việc với FastAPI và Microservices."
    })
    assert app_res.status_code == 201
    assert app_res.json()["job_post_id"] == job_id
    assert app_res.json()["status"] == "pending"

    # Duplicate application rejected
    dup_app = client.post(f"/api/v1/jobs/{job_id}/apply", headers=headers, json={
        "full_name": "Nguyễn Văn Developer",
        "email": "applicant@example.com"
    })
    assert dup_app.status_code == 400

    # View my applications
    my_apps = client.get("/api/v1/jobs/applications/me", headers=headers)
    assert my_apps.status_code == 200
    assert len(my_apps.json()) >= 1
    assert my_apps.json()[0]["job_title"] == "Senior Python FastAPI Developer"

    # View job applications list
    job_apps = client.get(f"/api/v1/jobs/{job_id}/applications", headers=headers)
    assert job_apps.status_code == 200
    assert len(job_apps.json()) >= 1


def test_event_registration_lifecycle(client):
    # Register user
    reg = client.post("/api/v1/auth/register", json={
        "email": "event_attendee@example.com",
        "username": "event_attendee",
        "name": "Event Attendee",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create event
    event_res = client.post("/api/v1/events", headers=headers, json={
        "title": "Mastering Microservices Architecture 2026",
        "description": "Hội thảo trực tuyến chia sẻ kiến trúc hệ thống phân tán quy mô lớn.",
        "organizer": "Cloud Native Vietnam",
        "event_type": "webinar",
        "start_time": "2026-10-15T09:00:00Z",
        "location": "Online Zoom / YouTube Live"
    })
    assert event_res.status_code == 201
    event_id = event_res.json()["id"]

    # Register for event
    rsvp_res = client.post(f"/api/v1/events/{event_id}/register", headers=headers, json={
        "full_name": "Trần Thị Attendee",
        "email": "event_attendee@example.com",
        "notes": "Quan tâm đến giải pháp Kubernetes Service Mesh"
    })
    assert rsvp_res.status_code == 201
    assert rsvp_res.json()["event_id"] == event_id

    # Duplicate RSVP rejected
    rsvp_dup = client.post(f"/api/v1/events/{event_id}/register", headers=headers, json={
        "full_name": "Trần Thị Attendee",
        "email": "event_attendee@example.com"
    })
    assert rsvp_dup.status_code == 400

    # View my registrations
    my_regs = client.get("/api/v1/events/registrations/me", headers=headers)
    assert my_regs.status_code == 200
    assert len(my_regs.json()) >= 1
    assert my_regs.json()[0]["event_title"] == "Mastering Microservices Architecture 2026"

    # View event registrations list
    event_regs = client.get(f"/api/v1/events/{event_id}/registrations", headers=headers)
    assert event_regs.status_code == 200
    assert len(event_regs.json()) >= 1


def test_rss_xml_parser():
    mock_rss = """<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Tech News RSS</title>
        <item>
          <title>Kiến trúc Event Sourcing với Python và CQRS</title>
          <description><![CDATA[Khám phá thiết kế hệ thống CQRS và Event Sourcing hiện đại.]]></description>
          <link>https://example.com/tech-article-1</link>
        </item>
      </channel>
    </rss>
    """
    items = parse_rss_feed(mock_rss)
    assert len(items) == 1
    assert items[0]["title"] == "Kiến trúc Event Sourcing với Python và CQRS"
    assert "CQRS" in items[0]["excerpt"]
    assert "https://example.com/tech-article-1" in items[0]["content"]


def test_rate_limiter_unit():
    test_limiter = SlidingWindowRateLimiter()
    key = "test_user_ip"

    # Allow up to 3 requests
    assert test_limiter.is_allowed(key, max_requests=3, window_seconds=10) is True
    assert test_limiter.is_allowed(key, max_requests=3, window_seconds=10) is True
    assert test_limiter.is_allowed(key, max_requests=3, window_seconds=10) is True

    # 4th request must be blocked
    assert test_limiter.is_allowed(key, max_requests=3, window_seconds=10) is False
    assert test_limiter.get_remaining(key, max_requests=3) == 0
