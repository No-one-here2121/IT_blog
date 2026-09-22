import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.post import Post, PostStatus


def test_ads_and_analytics(client: TestClient, db_session: Session, test_user: User, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Get active ads (triggers impression increment)
    ads_resp = client.get("/api/v1/ads/active?category=cloud")
    assert ads_resp.status_code == 200
    ads = ads_resp.json()
    assert len(ads) >= 1
    ad_id = ads[0]["id"]
    initial_impressions = ads[0]["impressions_count"]
    assert initial_impressions >= 1

    # 2. Record ad click
    click_resp = client.post(f"/api/v1/ads/{ad_id}/click", headers=headers)
    assert click_resp.status_code == 200
    assert click_resp.json()["ad_id"] == ad_id
    assert click_resp.json()["clicks_count"] >= 1
    assert "http" in click_resp.json()["target_url"]

    # 3. Create post to test post analytics
    post = Post(
        title="Kiến trúc Clean Architecture trong thực tế",
        slug="kien-truc-clean-architecture-thuc-te",
        content="Hướng dẫn triển khai Domain Driven Design và Clean Architecture trên Python...",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value,
        views=120
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # 4. Get post analytics
    p_analytics = client.get(f"/api/v1/analytics/posts/{post.id}", headers=headers)
    assert p_analytics.status_code == 200
    p_data = p_analytics.json()
    assert p_data["post_id"] == post.id
    assert p_data["views"] == 120
    assert p_data["avg_read_time_seconds"] > 0
    assert p_data["estimated_completion_rate"] > 0

    # 5. Get platform overview analytics
    overview_resp = client.get("/api/v1/analytics/overview")
    assert overview_resp.status_code == 200
    o_data = overview_resp.json()
    assert o_data["total_posts"] >= 1
    assert o_data["total_users"] >= 1
    assert len(o_data["daily_views_history"]) == 7

    # 6. Admin ad management: create, list all, pause, resume, delete
    create_ad_resp = client.post(
        "/api/v1/ads",
        headers=headers,
        json={
            "title": "Kubernetes Pro Course",
            "description": "Làm chủ k8s từ con số 0",
            "creative_url": "https://images.unsplash.com/photo-1517694712202",
            "target_url": "https://example.com/k8s",
            "category": "devops"
        }
    )
    assert create_ad_resp.status_code == 201
    new_ad_id = create_ad_resp.json()["id"]

    all_ads_resp = client.get("/api/v1/ads")
    assert all_ads_resp.status_code == 200
    assert any(a["id"] == new_ad_id for a in all_ads_resp.json())

    # Update status to paused
    pause_resp = client.put(f"/api/v1/ads/{new_ad_id}/status", headers=headers, json={"status": "paused"})
    assert pause_resp.status_code == 200
    assert pause_resp.json()["status"] == "paused"

    # Delete ad
    del_resp = client.delete(f"/api/v1/ads/{new_ad_id}", headers=headers)
    assert del_resp.status_code == 204
