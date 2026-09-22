from datetime import datetime, timezone
import pytest
from app.models.gamification import ReputationLog
from app.models.post import Post


def test_record_behavior_with_invalid_ids_safe(client):
    """
    Test that recording user behavior with non-existent post_id, category_id,
    or tag_id does NOT crash with a foreign key violation 500 error.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "behavior_tester@example.com",
        "username": "behavior_tester",
        "name": "Behavior Tester",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Pass nonexistent IDs (e.g. 999999)
    resp = client.post("/api/v1/behavior/events", headers=headers, json={
        "event_type": "view",
        "post_id": 999999,
        "category_id": 999999,
        "tag_id": 999999
    })
    assert resp.status_code == 201
    assert resp.json()["post_id"] is None
    assert resp.json()["category_id"] is None
    assert resp.json()["tag_id"] is None


def test_toggle_accept_answer_idempotent_reputation(client, db_session):
    """
    Test that toggling accept answer multiple times does NOT farm reputation points.
    Points (+20) are awarded only once.
    """
    # 1. Author registers
    reg_author = client.post("/api/v1/auth/register", json={
        "email": "post_author_round5@example.com",
        "username": "post_author_round5",
        "name": "Post Author Round 5",
        "password": "Password123"
    })
    h_author = {"Authorization": f"Bearer {reg_author.json()['access_token']}"}

    # 2. Commenter registers
    reg_commenter = client.post("/api/v1/auth/register", json={
        "email": "commenter_round5@example.com",
        "username": "commenter_round5",
        "name": "Commenter Round 5",
        "password": "Password123"
    })
    h_commenter = {"Authorization": f"Bearer {reg_commenter.json()['access_token']}"}
    commenter_id = reg_commenter.json()["user"]["id"]

    # 3. Create post
    post_res = client.post("/api/v1/posts", headers=h_author, json={
        "title": "Technical Question About Microservices",
        "content": "How to handle distributed transactions?",
        "status": "approved"
    })
    post_id = post_res.json()["id"]

    # 4. Commenter writes solution
    c_res = client.post(f"/api/v1/posts/{post_id}/comments", headers=h_commenter, json={
        "content": "Use Saga pattern with compensating transactions."
    })
    comment_id = c_res.json()["id"]

    # 5. Author accepts answer (First time: +20 points)
    acc1 = client.post(f"/api/v1/comments/{comment_id}/accept", headers=h_author)
    assert acc1.status_code == 200
    assert acc1.json()["is_accepted_answer"] is True

    # Count reputation logs for commenter
    rep_count1 = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == commenter_id,
        ReputationLog.action == "accepted_answer"
    ).count()
    assert rep_count1 == 1

    # 6. Author unmarks accept answer
    acc2 = client.post(f"/api/v1/comments/{comment_id}/accept", headers=h_author)
    assert acc2.status_code == 200
    assert acc2.json()["is_accepted_answer"] is False

    # 7. Author accepts answer again (Second time: should NOT add duplicate points!)
    acc3 = client.post(f"/api/v1/comments/{comment_id}/accept", headers=h_author)
    assert acc3.status_code == 200
    assert acc3.json()["is_accepted_answer"] is True

    rep_count2 = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == commenter_id,
        ReputationLog.action == "accepted_answer"
    ).count()
    assert rep_count2 == 1, "Reputation points must not be duplicated on re-accepting!"


def test_verify_post_idempotent_reputation(client, db_session):
    """
    Test that verifying a post multiple times does NOT award duplicate reputation points (+50).
    """
    # 1. Author registers
    reg_author = client.post("/api/v1/auth/register", json={
        "email": "author_ver_farm@example.com",
        "username": "author_ver_farm",
        "name": "Author Ver Farm",
        "password": "Password123"
    })
    h_author = {"Authorization": f"Bearer {reg_author.json()['access_token']}"}
    author_id = reg_author.json()["user"]["id"]

    # 2. Admin registers
    reg_admin = client.post("/api/v1/auth/register", json={
        "email": "admin_ver_farm@example.com",
        "username": "admin_ver_farm",
        "name": "Admin Ver Farm",
        "password": "Password123"
    })
    h_admin = {"Authorization": f"Bearer {reg_admin.json()['access_token']}"}
    admin_id = reg_admin.json()["user"]["id"]

    # Promote to admin
    from app.models.user import User, Role
    u = db_session.query(User).filter(User.id == admin_id).first()
    r = db_session.query(Role).filter(Role.name == "admin").first()
    if not r:
        r = Role(name="admin", description="Administrator")
        db_session.add(r)
        db_session.flush()
    u.roles.append(r)
    u.is_superuser = True
    db_session.commit()

    # 3. Author creates post
    post_res = client.post("/api/v1/posts", headers=h_author, json={
        "title": "Post For Idempotent Verification",
        "content": "Deep technical content to be verified.",
        "status": "approved"
    })
    post_id = post_res.json()["id"]

    # 4. Verify post (First time: +50 points)
    v1 = client.post(f"/api/v1/posts/{post_id}/verify", headers=h_admin, json={"is_verified": True})
    assert v1.status_code == 200
    assert v1.json()["is_verified"] is True

    rep_count1 = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == author_id,
        ReputationLog.action == "verified_post"
    ).count()
    assert rep_count1 == 1

    # 5. Un-verify post
    v2 = client.post(f"/api/v1/posts/{post_id}/verify", headers=h_admin, json={"is_verified": False})
    assert v2.status_code == 200

    # 6. Re-verify post (Second time: should not add duplicate points!)
    v3 = client.post(f"/api/v1/posts/{post_id}/verify", headers=h_admin, json={"is_verified": True})
    assert v3.status_code == 200

    rep_count2 = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == author_id,
        ReputationLog.action == "verified_post"
    ).count()
    assert rep_count2 == 1, "Reputation points must not be duplicated on re-verifying!"


def test_apply_closed_job_rejected(client, db_session):
    """
    Test that applying for a closed or paused job is rejected with HTTP 400.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "applicant_round5@example.com",
        "username": "applicant_round5",
        "name": "Applicant Round 5",
        "password": "Password123"
    })
    h = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # Create job
    j_res = client.post("/api/v1/jobs", headers=h, json={
        "company_name": "Closed Company",
        "title": "Closed Job Opportunity",
        "location": "Remote",
        "description": "Job description here"
    })
    job_id = j_res.json()["id"]

    # Manually set job status to 'closed'
    from app.models.company_job import JobPost
    job = db_session.query(JobPost).filter(JobPost.id == job_id).first()
    job.status = "closed"
    db_session.commit()

    # Attempt to apply
    app_res = client.post(f"/api/v1/jobs/{job_id}/apply", headers=h, json={
        "full_name": "Test Applicant",
        "email": "applicant_round5@example.com"
    })
    assert app_res.status_code == 400
    assert "đã đóng" in app_res.json()["detail"].lower()


def test_register_ended_event_rejected(client, db_session):
    """
    Test that registering for an event with status 'ended' is rejected with HTTP 400.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "attendee_round5@example.com",
        "username": "attendee_round5",
        "name": "Attendee Round 5",
        "password": "Password123"
    })
    h = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # Create event
    ev_res = client.post("/api/v1/events", headers=h, json={
        "title": "Past Hackathon 2025",
        "description": "This hackathon has concluded.",
        "organizer": "Tech Community",
        "start_time": "2025-01-01T08:00:00Z"
    })
    ev_id = ev_res.json()["id"]

    # Mark as ended
    from app.models.event import Event
    event = db_session.query(Event).filter(Event.id == ev_id).first()
    event.status = "ended"
    db_session.commit()

    # Attempt to register
    r_res = client.post(f"/api/v1/events/{ev_id}/register", headers=h, json={
        "full_name": "Late Attendee",
        "email": "attendee_round5@example.com"
    })
    assert r_res.status_code == 400
    assert "kết thúc" in r_res.json()["detail"].lower()


def test_enroll_draft_course_rejected(client, db_session):
    """
    Test that regular users cannot enroll in a draft course.
    """
    # 1. Instructor
    reg_inst = client.post("/api/v1/auth/register", json={
        "email": "inst_round5@example.com",
        "username": "inst_round5",
        "name": "Instructor 5",
        "password": "Password123"
    })
    h_inst = {"Authorization": f"Bearer {reg_inst.json()['access_token']}"}

    # 2. Student
    reg_student = client.post("/api/v1/auth/register", json={
        "email": "student_round5@example.com",
        "username": "student_round5",
        "name": "Student 5",
        "password": "Password123"
    })
    h_student = {"Authorization": f"Bearer {reg_student.json()['access_token']}"}

    # Create course
    c_res = client.post("/api/v1/courses", headers=h_inst, json={
        "title": "Draft Kubernetes Security Course",
        "description": "In development course."
    })
    course_id = c_res.json()["id"]

    # Set course to draft
    from app.models.course import Course
    course = db_session.query(Course).filter(Course.id == course_id).first()
    course.status = "draft"
    db_session.commit()

    # Student attempts to enroll
    enr_res = client.post(f"/api/v1/courses/{course_id}/enroll", headers=h_student)
    assert enr_res.status_code == 400
    assert "chưa được xuất bản" in enr_res.json()["detail"].lower()


def test_click_inactive_ad_rejected(client, db_session):
    """
    Test that clicking an inactive/paused ad returns HTTP 400.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "ad_clicker_round5@example.com",
        "username": "ad_clicker_round5",
        "name": "Ad Clicker 5",
        "password": "Password123"
    })
    h = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # Create ad
    ad_res = client.post("/api/v1/ads", headers=h, json={
        "title": "Paused Promotion Campaign",
        "description": "Promo details",
        "creative_url": "https://example.com/ad.png",
        "target_url": "https://example.com/offer"
    })
    ad_id = ad_res.json()["id"]

    # Pause ad
    client.put(f"/api/v1/ads/{ad_id}/status", headers=h, json={"status": "paused"})

    # Click paused ad
    click_res = client.post(f"/api/v1/ads/{ad_id}/click")
    assert click_res.status_code == 400
    assert "không còn hoạt động" in click_res.json()["detail"].lower()
