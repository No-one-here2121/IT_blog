import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.post import Post, PostStatus
from app.models.gamification import Badge, ReputationLog


def test_roadmaps_lifecycle(client: TestClient, db_session: Session, test_user: User, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a roadmap with steps
    payload = {
        "title": "Lộ trình Fullstack Web Developer 2026",
        "description": "Lộ trình hoàn chỉnh từ HTML/CSS đến Docker, FastAPI và React",
        "level": "basic",
        "steps": [
            {"order_index": 1, "title": "Cơ bản về JavaScript ES6+", "description": "Promise, Async/Await"},
            {"order_index": 2, "title": "FastAPI Core Concepts", "description": "Pydantic v2, SQLAlchemy ORM"},
            {"order_index": 3, "title": "React & Tailwind CSS", "description": "Component State & Hooks"}
        ]
    }
    resp = client.post("/api/v1/roadmaps", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    roadmap_id = data["id"]
    slug = data["slug"]
    assert data["total_steps"] == 3
    assert len(data["steps"]) == 3
    assert data["steps"][0]["is_completed"] is False

    # 2. Get roadmaps list
    list_resp = client.get("/api/v1/roadmaps?level=basic", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1
    assert list_resp.json()[0]["total_steps"] == 3

    # 3. Get roadmap detail by slug
    detail_resp = client.get(f"/api/v1/roadmaps/{slug}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == roadmap_id
    step_1_id = detail_resp.json()["steps"][0]["id"]

    # 4. Toggle step completion
    toggle_resp = client.post(f"/api/v1/roadmaps/{roadmap_id}/steps/{step_1_id}/toggle", headers=headers)
    assert toggle_resp.status_code == 200
    toggle_data = toggle_resp.json()
    assert toggle_data["is_completed"] is True
    assert toggle_data["completed_steps"] == 1
    assert toggle_data["progress_percentage"] > 30.0

    # Detail should reflect completed step
    detail_resp_updated = client.get(f"/api/v1/roadmaps/{roadmap_id}", headers=headers)
    assert detail_resp_updated.json()["steps"][0]["is_completed"] is True
    assert detail_resp_updated.json()["completed_steps"] == 1


def test_gamification_and_leaderboard(client: TestClient, db_session: Session, test_user: User):
    # 1. Fetch badges list
    badge_resp = client.get("/api/v1/gamification/badges")
    assert badge_resp.status_code == 200
    badges = badge_resp.json()
    assert len(badges) >= 5
    assert any(b["slug"] == "verified-author" for b in badges)

    # 2. Add reputation points
    rep1 = ReputationLog(
        user_id=test_user.id,
        points=100,
        action="verified_post"
    )
    rep2 = ReputationLog(
        user_id=test_user.id,
        points=50,
        action="accepted_answer"
    )
    db_session.add_all([rep1, rep2])
    db_session.commit()

    # 3. Check leaderboard
    lb_resp = client.get("/api/v1/gamification/leaderboard?limit=5")
    assert lb_resp.status_code == 200
    lb = lb_resp.json()
    assert len(lb) >= 1
    top_user = lb[0]
    assert top_user["user_id"] == test_user.id
    assert top_user["reputation_points"] == 150

    # 4. Check user reputation stats
    stats_resp = client.get(f"/api/v1/gamification/users/{test_user.id}/reputation")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["user_id"] == test_user.id
    assert stats["total_points"] == 150
    assert stats["rank"] == 1
    assert len(stats["recent_logs"]) == 2
