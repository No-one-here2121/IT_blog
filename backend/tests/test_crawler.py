import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.post import Post


def test_crawler_sources_and_trigger(client: TestClient, db_session: Session, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create crawl source
    source_payload = {
        "name": "Dev.to Architecture News",
        "url": "https://dev.to/feed/tag/architecture",
        "source_type": "rss"
    }
    src_resp = client.post("/api/v1/crawler/sources", json=source_payload, headers=headers)
    assert src_resp.status_code == 201
    source_data = src_resp.json()
    source_id = source_data["id"]
    assert source_data["name"] == source_payload["name"]

    # 2. List sources
    list_resp = client.get("/api/v1/crawler/sources")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 3. Trigger crawl with auto_publish = True
    trig_resp = client.post(
        "/api/v1/crawler/trigger",
        json={"source_id": source_id, "auto_publish": True},
        headers=headers
    )
    assert trig_resp.status_code == 200
    trig_data = trig_resp.json()
    assert trig_data["job"]["status"] == "success"
    assert trig_data["job"]["items_crawled"] >= 3
    assert trig_data["job"]["items_saved"] >= 1

    first_saved_count = trig_data["job"]["items_saved"]

    # 4. Trigger crawl again -> Duplicate detection should prevent re-inserting
    re_trig = client.post(
        "/api/v1/crawler/trigger",
        json={"source_id": source_id, "auto_publish": True},
        headers=headers
    )
    assert re_trig.status_code == 200
    assert re_trig.json()["job"]["items_saved"] == 0  # 0 duplicates saved

    # 5. List jobs
    jobs_resp = client.get("/api/v1/crawler/jobs")
    assert jobs_resp.status_code == 200
    assert len(jobs_resp.json()) >= 2
