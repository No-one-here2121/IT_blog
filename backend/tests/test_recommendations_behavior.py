import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.category import Category
from app.models.post import Post, PostStatus


def test_behavior_events_and_recommendations(
    client: TestClient, db_session: Session, test_user: User, test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Ensure category and post exist
    cat = db_session.query(Category).first()
    post = Post(
        title="Lập trình Asyncio trong Python chuyên sâu",
        slug="lap-trinh-asyncio-python-chuyen-sau",
        content="Chi tiết về event loop, coroutine và task trong Python asyncio.",
        category_id=cat.id if cat else None,
        author_id=test_user.id,
        status=PostStatus.APPROVED.value,
        views=45
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # 2. Record behavior event
    event_payload = {
        "event_type": "read_30s",
        "post_id": post.id,
        "category_id": post.category_id,
        "metadata_json": '{"dwell_time_seconds": 45}'
    }
    ev_resp = client.post("/api/v1/behavior/events", json=event_payload, headers=headers)
    assert ev_resp.status_code == 201
    ev_data = ev_resp.json()
    assert ev_data["event_type"] == "read_30s"
    assert ev_data["post_id"] == post.id

    # 3. Get recommended feed
    feed_resp = client.get("/api/v1/recommendations/feed?limit=5", headers=headers)
    assert feed_resp.status_code == 200
    feed = feed_resp.json()
    assert len(feed) >= 1

    # 4. Get recommended authors
    authors_resp = client.get("/api/v1/recommendations/authors?limit=5")
    assert authors_resp.status_code == 200
    authors = authors_resp.json()
    assert len(authors) >= 1

    # 5. Get recommended topics
    topics_resp = client.get("/api/v1/recommendations/topics?limit=5")
    assert topics_resp.status_code == 200
    topics = topics_resp.json()
    assert len(topics) >= 1
