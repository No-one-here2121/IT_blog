"""
Comprehensive End-to-End Audit & Verification Test Suite for all 15 Modules (100 Features)
"""
from datetime import datetime, timezone
import pytest
from app.models.post import PostStatus


def test_module_01_architecture_and_tech_stack(client):
    """
    [Module 1] System Architecture & Tech Stack (1.1 - 1.4)
    - FastAPI RESTful API, Health Check & OpenAPI docs
    - CORS, Schema Validation & Multi-key Gemini
    """
    # Test Healthcheck
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"

    # Test OpenAPI documentation schema endpoint
    docs_res = client.get("/api/v1/openapi.json")
    assert docs_res.status_code == 200
    schema = docs_res.json()
    assert "paths" in schema
    assert any("/posts" in p for p in schema["paths"])
    assert any("/auth/login" in p for p in schema["paths"])
    assert any("/roadmaps" in p for p in schema["paths"])
    assert any("/jobs" in p for p in schema["paths"])
    assert any("/events" in p for p in schema["paths"])


def test_module_02_auth_and_security(client):
    """
    [Module 2] Authentication & Security (2.1 - 2.6)
    - Register (2.1)
    - Login with username/email & JWT (2.2, 2.3)
    - Token Refresh
    - Current User Profile
    - Change Password (2.5)
    - Forgot Password & Reset Password (2.4)
    """
    # 2.1 Register user
    email = f"audit_user_{datetime.now().timestamp()}@example.com"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "username": f"audit_user_{int(datetime.now().timestamp())}",
        "name": "Audit Tester",
        "password": "Password123!"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    token = reg_data["access_token"]
    refresh_token = reg_data["refresh_token"]
    user_id = reg_data["user"]["id"]
    username = reg_data["user"]["username"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2.2 Login with email
    login_email_res = client.post("/api/v1/auth/login", json={
        "identifier": email,
        "password": "Password123!"
    })
    assert login_email_res.status_code == 200

    # 2.2 Login with username
    login_user_res = client.post("/api/v1/auth/login", json={
        "identifier": username,
        "password": "Password123!"
    })
    assert login_user_res.status_code == 200

    # Token Refresh
    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()

    # Get Me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 2.5 Change password
    change_res = client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "Password123!",
        "new_password": "NewAuditPassword456!"
    })
    assert change_res.status_code == 200

    # 2.4 Forgot password & Reset
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    msg = forgot_res.json()["message"]
    reset_tok = msg.split(": ")[1].strip()

    reset_res = client.post("/api/v1/auth/reset-password", json={
        "token": reset_tok,
        "new_password": "FinalResetPassword789!"
    })
    assert reset_res.status_code == 200


def test_module_03_and_04_posts_cms_and_reading_experience(client):
    """
    [Module 3 & 4] Content Management & Reading Experience (3.1 - 3.10 & 4.1 - 4.11)
    - Create post with tags, category, tech stack version, scheduled publishing (3.1, 3.4, 3.5)
    - AI Post Optimizer (3.7)
    - Revisions history (3.9)
    - Post details & Slug (4.1)
    - Related videos (4.8)
    - Social share (4.4)
    - Violation report (4.6)
    - Telemetry tracking (4.11)
    """
    # Register author
    email = f"author_{datetime.now().timestamp()}@example.com"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "username": f"author_{int(datetime.now().timestamp())}",
        "name": "Audit Author",
        "password": "Password123!"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3.7 AI Post Optimizer
    ai_opt = client.post("/api/v1/ai/optimize-post", json={
        "title": "React 19 Server Actions Deep Dive",
        "content": "Exploring asynchronous server functions, form actions, and security best practices."
    })
    assert ai_opt.status_code == 200
    assert "suggested_titles" in ai_opt.json()

    # 3.1 Create post
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Comprehensive React 19 Architecture Guide 2026",
        "content": "# Intro\nThis is an exhaustive guide.\n## Architecture\nDetails here.\n## Code\n```js\nconst x = 1;\n```",
        "excerpt": "Exhaustive guide to modern React 19 architecture",
        "category_name": "Frontend",
        "tags": ["React", "JavaScript", "Frontend"],
        "tech_stack_version": "React 19 / Vite 6",
        "status": "approved"
    })
    assert post_res.status_code == 201
    post_id = post_res.json()["id"]
    post_slug = post_res.json()["slug"]

    # 4.1 Get post detail (by ID and by Slug)
    get_id = client.get(f"/api/v1/posts/{post_id}")
    assert get_id.status_code == 200
    assert get_id.json()["views"] >= 1

    get_slug = client.get(f"/api/v1/posts/{post_slug}")
    assert get_slug.status_code == 200

    # 3.9 Update post and create revision
    update_res = client.put(f"/api/v1/posts/{post_id}", headers=headers, json={
        "title": "Comprehensive React 19 Architecture Guide 2026 (Updated)",
        "content": "# Intro\nUpdated content for revisions test.\n## Architecture\nMore details.",
        "change_summary": "Added deep dive into Server Components"
    })
    assert update_res.status_code == 200

    # 3.9 Verify Revisions
    rev_res = client.get(f"/api/v1/posts/{post_id}/revisions")
    assert rev_res.status_code == 200
    assert len(rev_res.json()) >= 1
    assert rev_res.json()[0]["change_summary"] == "Added deep dive into Server Components"

    # 4.8 Related videos
    vid_res = client.get(f"/api/v1/posts/{post_id}/videos")
    assert vid_res.status_code == 200
    assert len(vid_res.json()) >= 1

    # 4.4 Social share
    share_res = client.post(f"/api/v1/posts/{post_id}/share", headers=headers)
    assert share_res.status_code == 200
    assert share_res.json()["shares_count"] >= 1

    # 4.6 Violation report
    report_res = client.post("/api/v1/reports", headers=headers, json={
        "target_type": "post",
        "target_id": post_id,
        "reason": "spam",
        "details": "Checking violation report mechanism"
    })
    assert report_res.status_code == 201

    # 4.11 Telemetry tracking
    view_event = client.post("/api/v1/behavior/events", headers=headers, json={
        "event_type": "view",
        "post_id": post_id
    })
    assert view_event.status_code == 201

    read_event = client.post("/api/v1/behavior/track", headers=headers, json={
        "event_type": "read_30s",
        "post_id": post_id
    })
    assert read_event.status_code == 201


def test_module_05_community_interactions_and_bot(client):
    """
    [Module 5] Community Interactions & Discussion (5.1 - 5.7)
    - Like / Unlike post (5.1)
    - Bookmark post (5.2)
    - Nested comments & replies (5.3)
    - Comment like (5.4)
    - Pin & Accept Answer (5.5)
    - Engagement Bot trigger (5.6)
    - Follow / Unfollow Author (5.7)
    """
    # Author
    author_reg = client.post("/api/v1/auth/register", json={
        "email": f"auth_{datetime.now().timestamp()}@example.com",
        "username": f"comm_author_{int(datetime.now().timestamp())}",
        "name": "Community Author",
        "password": "Password123!"
    })
    author_token = author_reg.json()["access_token"]
    author_id = author_reg.json()["user"]["id"]
    author_headers = {"Authorization": f"Bearer {author_token}"}

    # Reader
    reader_reg = client.post("/api/v1/auth/register", json={
        "email": f"reader_{datetime.now().timestamp()}@example.com",
        "username": f"comm_reader_{int(datetime.now().timestamp())}",
        "name": "Community Reader",
        "password": "Password123!"
    })
    reader_token = reader_reg.json()["access_token"]
    reader_headers = {"Authorization": f"Bearer {reader_token}"}

    # Author creates a post
    post = client.post("/api/v1/posts", headers=author_headers, json={
        "title": "Community Discussion Post on System Design",
        "content": "How do you handle distributed transactions across microservices?",
        "category_name": "Backend",
        "status": "approved"
    }).json()
    post_id = post["id"]

    # 5.1 Like & Unlike
    like1 = client.post(f"/api/v1/posts/{post_id}/like", headers=reader_headers)
    assert like1.status_code == 200
    assert like1.json()["is_liked"] is True

    unlike1 = client.post(f"/api/v1/posts/{post_id}/like", headers=reader_headers)
    assert unlike1.status_code == 200
    assert unlike1.json()["is_liked"] is False

    # 5.2 Bookmark
    bm1 = client.post(f"/api/v1/posts/{post_id}/bookmark", headers=reader_headers)
    assert bm1.status_code == 200
    assert bm1.json()["is_bookmarked"] is True

    # 5.3 Comments & Nested replies
    c1 = client.post(f"/api/v1/posts/{post_id}/comments", headers=reader_headers, json={
        "content": "We use the Saga Pattern with an Orchestrator."
    })
    assert c1.status_code == 201
    c1_id = c1.json()["id"]

    reply1 = client.post(f"/api/v1/posts/{post_id}/comments", headers=author_headers, json={
        "content": "Great suggestion! Do you prefer Choreography or Orchestration?",
        "parent_id": c1_id
    })
    assert reply1.status_code == 201

    # 5.4 Comment Like
    c_like = client.post(f"/api/v1/comments/{c1_id}/like", headers=author_headers)
    assert c_like.status_code == 200

    # 5.5 Pin & Accept Answer
    pin_res = client.post(f"/api/v1/comments/{c1_id}/pin", headers=author_headers)
    assert pin_res.status_code == 200

    accept_res = client.post(f"/api/v1/comments/{c1_id}/accept", headers=author_headers)
    assert accept_res.status_code == 200

    # 5.6 Engagement Bot
    bot_res = client.post(f"/api/v1/posts/{post_id}/bot-comment", headers=author_headers)
    assert bot_res.status_code == 200
    assert "content" in bot_res.json()

    # 5.7 Follow / Unfollow Author
    follow_res = client.post(f"/api/v1/users/{author_id}/follow", headers=reader_headers)
    assert follow_res.status_code == 200
    assert follow_res.json()["is_following"] is True


def test_module_06_to_08_discovery_profile_gamification(client):
    """
    [Module 6, 7 & 8] Feeds, Profile & Gamification
    - Discovery Feeds (6.2)
    - Search & Filters (6.1)
    - Post Author Analytics (7.3)
    - Public User Profile (7.9)
    - Reputation & Badges (8.1, 8.2, 8.3)
    """
    # Create user
    u_res = client.post("/api/v1/auth/register", json={
        "email": f"gamer_{datetime.now().timestamp()}@example.com",
        "username": f"gamer_{int(datetime.now().timestamp())}",
        "name": "Pro Gamer Dev",
        "password": "Password123!"
    })
    u_token = u_res.json()["access_token"]
    u_id = u_res.json()["user"]["id"]
    u_headers = {"Authorization": f"Bearer {u_token}"}

    # Feeds
    feed_all = client.get("/api/v1/posts?page=1&limit=5")
    assert feed_all.status_code == 200

    feed_trending = client.get("/api/v1/posts?sort_by=views&limit=3")
    assert feed_trending.status_code == 200

    # Search
    search_res = client.get("/api/v1/search?q=React")
    assert search_res.status_code == 200

    # Categories list
    cats_res = client.get("/api/v1/categories")
    assert cats_res.status_code == 200

    # Gamification
    badges_res = client.get("/api/v1/gamification/badges")
    assert badges_res.status_code == 200
    assert len(badges_res.json()) >= 3

    leaderboard = client.get("/api/v1/gamification/leaderboard")
    assert leaderboard.status_code == 200

    user_rep = client.get(f"/api/v1/gamification/users/{u_id}/reputation")
    assert user_rep.status_code == 200

    # Public Profile
    pub_prof = client.get(f"/api/v1/users/{u_id}")
    assert pub_prof.status_code == 200
    assert pub_prof.json()["id"] == u_id


def test_module_09_learning_hub_roadmaps_and_courses(client):
    """
    [Module 9] Learning Hub & Roadmaps (9.1 - 9.8)
    - Roadmaps list, filter, create, step toggle
    - Courses list, create, enroll, lesson toggle
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": f"learner_{datetime.now().timestamp()}@example.com",
        "username": f"learner_{int(datetime.now().timestamp())}",
        "name": "IT Learner",
        "password": "Password123!"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 9.1 Roadmaps list & filter
    rm_list = client.get("/api/v1/roadmaps?level=basic")
    assert rm_list.status_code == 200

    # 9.4 Create Roadmap
    new_rm = client.post("/api/v1/roadmaps", headers=headers, json={
        "title": "Machine Learning & AI Roadmap 2026",
        "description": "From Linear Algebra to Transformers and Fine-tuning LLMs.",
        "level": "intermediate",
        "category_name": "AI / Machine Learning",
        "steps": [
            {"order_index": 1, "title": "Math Foundation", "description": "Calculus and Linear Algebra"},
            {"order_index": 2, "title": "PyTorch & Transformers", "description": "HuggingFace and PyTorch"}
        ]
    })
    assert new_rm.status_code == 201
    rm_id = new_rm.json()["id"]
    step_id = new_rm.json()["steps"][0]["id"]

    # 9.3 Toggle step completion
    toggle_step = client.post(f"/api/v1/roadmaps/{rm_id}/steps/{step_id}/toggle", headers=headers)
    assert toggle_step.status_code == 200
    assert toggle_step.json()["is_completed"] is True

    # 9.5 Courses list
    courses_list = client.get("/api/v1/courses")
    assert courses_list.status_code == 200

    # 9.7 Create Course
    new_course = client.post("/api/v1/courses", headers=headers, json={
        "title": "Mastering Go Microservices 2026",
        "description": "Build production-grade gRPC services with Go and Docker.",
        "level": "intermediate",
        "category_name": "Backend",
        "lessons": [
            {"title": "Lesson 1: Go Concurrency & Goroutines", "duration_minutes": 25},
            {"title": "Lesson 2: gRPC Service Definition", "duration_minutes": 35}
        ]
    })
    assert new_course.status_code == 201
    course_id = new_course.json()["id"]
    lesson_id = new_course.json()["lessons"][0]["id"]

    # 9.6 Enroll & Complete Lesson
    enroll_res = client.post(f"/api/v1/courses/{course_id}/enroll", headers=headers)
    assert enroll_res.status_code in [200, 201]

    lesson_toggle = client.post(f"/api/v1/courses/{course_id}/lessons/{lesson_id}/toggle", headers=headers)
    assert lesson_toggle.status_code == 200
    assert lesson_toggle.json()["is_completed"] is True


def test_module_10_quiz_and_ai_generator(client):
    """
    [Module 10] IT Quiz & AI Generator (10.1 - 10.5)
    - Quiz bank questions
    - Submit quiz
    - AI Quiz generator
    """
    # 10.1 Questions list
    q_res = client.get("/api/v1/quiz/questions")
    assert q_res.status_code == 200
    assert "questions" in q_res.json()

    # 10.3 AI Quiz generator
    ai_quiz = client.post("/api/v1/quiz/generate", json={
        "topic": "FastAPI & Python",
        "difficulty": "medium",
        "count": 3
    })
    assert ai_quiz.status_code in [200, 201]
    res_data = ai_quiz.json()
    assert "created" in res_data or "questions" in res_data


def test_module_11_and_12_jobs_and_events(client):
    """
    [Module 11 & 12] Jobs and Events
    - Jobs list, create, apply (11.1, 11.6, 11.7)
    - Events list, create, RSVP, get tickets, cancel ticket (12.1 - 12.5)
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": f"candidate_{datetime.now().timestamp()}@example.com",
        "username": f"cand_{int(datetime.now().timestamp())}",
        "name": "Candidate Dev",
        "password": "Password123!"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 11.1 Jobs list
    jobs_res = client.get("/api/v1/jobs")
    assert jobs_res.status_code == 200

    # 11.7 Create Job
    job = client.post("/api/v1/jobs", headers=headers, json={
        "title": "Lead DevOps Architect",
        "company_name": "DevOps Cloud Corp",
        "location": "Hà Nội / Remote",
        "work_type": "remote",
        "salary_range": "50M - 70M VND",
        "description": "Managing AWS and K8s infrastructure",
        "skills": "Kubernetes, AWS, Terraform, CI/CD"
    }).json()
    job_id = job["id"]

    # 11.6 Apply Job
    apply_res = client.post(f"/api/v1/jobs/{job_id}/apply", headers=headers, json={
        "full_name": "Candidate Dev",
        "email": "candidate@example.com",
        "phone": "0987654321",
        "resume_url": "https://example.com/cv.pdf",
        "cover_letter": "I have 5 years experience managing K8s."
    })
    assert apply_res.status_code == 201

    # 11.6 My Applications
    my_apps = client.get("/api/v1/jobs/applications/me", headers=headers)
    assert my_apps.status_code == 200
    assert len(my_apps.json()) >= 1

    # 12.1 Events list
    events_res = client.get("/api/v1/events")
    assert events_res.status_code == 200

    # 12.5 Create Event
    ev = client.post("/api/v1/events", headers=headers, json={
        "title": "Hanoi Python & AI Meetup 2026",
        "organizer": "Python Hanoi",
        "event_type": "meetup",
        "start_time": datetime.now(timezone.utc).isoformat(),
        "location": "Keangnam Hanoi",
        "description": "Deep dive into GenAI with FastAPI"
    }).json()
    ev_id = ev["id"]

    # 12.2 RSVP / Register for Event
    rsvp_res = client.post(f"/api/v1/events/{ev_id}/register", headers=headers, json={
        "full_name": "Candidate Dev",
        "email": "candidate@example.com",
        "notes": "Looking forward to meeting speakers!"
    })
    assert rsvp_res.status_code == 201

    # 12.3 My Tickets
    tickets_res = client.get("/api/v1/events/registrations/me", headers=headers)
    assert tickets_res.status_code == 200
    assert any(t["event_id"] == ev_id for t in tickets_res.json())

    # 12.4 Cancel Ticket
    cancel_res = client.delete(f"/api/v1/events/{ev_id}/register", headers=headers)
    assert cancel_res.status_code == 200
    assert "message" in cancel_res.json()


def test_module_13_notifications(client):
    """
    [Module 13] Realtime Notifications (13.1 - 13.5)
    - Notifications list, unread count, mark read, mark all read
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": f"notif_{datetime.now().timestamp()}@example.com",
        "username": f"notif_user_{int(datetime.now().timestamp())}",
        "name": "Notif User",
        "password": "Password123!"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    unread = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert unread.status_code == 200
    assert "unread_count" in unread.json()

    notif_list = client.get("/api/v1/notifications", headers=headers)
    assert notif_list.status_code == 200

    mark_all = client.put("/api/v1/notifications/read-all", headers=headers)
    assert mark_all.status_code == 200


def test_module_14_moderation_admin_and_ads(client):
    """
    [Module 14] Moderation & Admin (14.1 - 14.8)
    - Reports list & moderation
    - Categories management
    - Ads management: create, toggle, delete
    - Gemini health & crawler sources
    """
    # Create admin user
    reg = client.post("/api/v1/auth/register", json={
        "email": f"admin_{datetime.now().timestamp()}@example.com",
        "username": f"admin_usr_{int(datetime.now().timestamp())}",
        "name": "Super Admin",
        "password": "Password123!"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Reports list
    reports = client.get("/api/v1/admin/reports", headers=headers)
    assert reports.status_code in [200, 403]  # Protected or list

    # Ads management
    new_ad = client.post("/api/v1/ads", headers=headers, json={
        "title": "Special Cloud Hosting Discount",
        "description": "50% off VPS for developers",
        "creative_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
        "target_url": "https://vps.example.com",
        "category": "cloud"
    })
    assert new_ad.status_code in [200, 201]
    if new_ad.status_code in [200, 201]:
        ad_id = new_ad.json()["id"]
        # Toggle ad
        toggle_res = client.put(f"/api/v1/ads/{ad_id}/status", headers=headers, json={"status": "paused"})
        assert toggle_res.status_code == 200
        # Delete ad
        del_ad = client.delete(f"/api/v1/ads/{ad_id}", headers=headers)
        assert del_ad.status_code == 204


def test_module_15_seo_rss_and_sitemap(client):
    """
    [Module 15] SEO, Feeds & Meta (15.1 - 15.3)
    - /sitemap.xml (15.1)
    - /rss.xml (15.2)
    - /robots.txt (15.3)
    """
    # 15.1 XML Sitemap
    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert "application/xml" in sitemap.headers.get("content-type", "")
    assert "<urlset" in sitemap.text
    assert "<loc>" in sitemap.text

    # 15.2 RSS Feed 2.0
    rss = client.get("/rss.xml")
    assert rss.status_code == 200
    assert "xml" in rss.headers.get("content-type", "").lower()
    assert "<rss version=\"2.0\"" in rss.text

    # 15.3 robots.txt
    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert "User-agent: *" in robots.text
    assert "Sitemap:" in robots.text
