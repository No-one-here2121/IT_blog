import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.category import Category
from app.models.post import Post, PostStatus


def test_tiktok_facebook_personalized_recommendation(
    client: TestClient, db_session: Session, test_user: User, test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Setup two categories: DevOps and Frontend
    cat_devops = db_session.query(Category).filter(Category.name == "DevOps").first()
    if not cat_devops:
        cat_devops = Category(name="DevOps", slug="devops", icon="🐳", description="DevOps and Cloud")
        db_session.add(cat_devops)
        db_session.commit()
        db_session.refresh(cat_devops)

    cat_frontend = db_session.query(Category).filter(Category.name == "Frontend").first()
    if not cat_frontend:
        cat_frontend = Category(name="Frontend", slug="frontend", icon="⚛️", description="Frontend & UI")
        db_session.add(cat_frontend)
        db_session.commit()
        db_session.refresh(cat_frontend)

    # 2. Create sample posts
    p_devops = Post(
        title="Triển khai Kubernetes Cluster Production 2026",
        slug="trien-khai-kubernetes-cluster-production-2026",
        content="Hướng dẫn chi tiết thiết lập Kubernetes HA trên AWS EKS.",
        category_id=cat_devops.id,
        author_id=test_user.id,
        status=PostStatus.APPROVED.value,
        views=150,
        shares_count=12
    )
    p_frontend = Post(
        title="Học CSS Grid Layout cơ bản",
        slug="hoc-css-grid-layout-co-ban-2026",
        content="Khái niệm cơ bản về display grid.",
        category_id=cat_frontend.id,
        author_id=test_user.id,
        status=PostStatus.APPROVED.value,
        views=20,
        shares_count=0
    )
    db_session.add(p_devops)
    db_session.add(p_frontend)
    db_session.commit()
    db_session.refresh(p_devops)
    db_session.refresh(p_frontend)

    # 3. Simulate TikTok Dwell Time & Deep Reading on DevOps post (>30s and >60s)
    ev1 = client.post("/api/v1/behavior/events", json={
        "event_type": "read_30s",
        "post_id": p_devops.id,
        "category_id": cat_devops.id
    }, headers=headers)
    assert ev1.status_code == 201

    ev2 = client.post("/api/v1/behavior/events", json={
        "event_type": "read_deep",
        "post_id": p_devops.id,
        "category_id": cat_devops.id
    }, headers=headers)
    assert ev2.status_code == 201

    ev3 = client.post("/api/v1/behavior/events", json={
        "event_type": "bookmark",
        "post_id": p_devops.id,
        "category_id": cat_devops.id
    }, headers=headers)
    assert ev3.status_code == 201

    # 4. Request /feeds/for-you with user token
    foryou_resp = client.get("/api/v1/feeds/for-you?page=1&limit=10", headers=headers)
    assert foryou_resp.status_code == 200
    data = foryou_resp.json()
    assert "items" in data
    assert len(data["items"]) >= 2

    # 5. Request /recommendations/feed
    rec_resp = client.get("/api/v1/recommendations/feed?limit=5", headers=headers)
    assert rec_resp.status_code == 200
    rec_items = rec_resp.json()
    assert len(rec_items) >= 1
