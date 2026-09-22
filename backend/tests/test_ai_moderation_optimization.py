import pytest
from fastapi.testclient import TestClient


def test_ai_moderation_approved(client: TestClient):
    payload = {
        "title": "Kiến trúc Microservices với FastAPI và Docker",
        "content": "Bài viết hướng dẫn cách thiết lập hệ thống microservices sử dụng FastAPI, Docker và kết nối PostgreSQL qua connection pool."
    }
    resp = client.post("/api/v1/ai/moderate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_safe"] is True
    assert data["is_tech_related"] is True
    assert data["verdict"] == "approved"
    assert data["spam_score"] < 0.2


def test_ai_moderation_rejected_spam_toxic(client: TestClient):
    # Spam
    spam_payload = {
        "title": "Đăng ký nhận thưởng casino cá cược bet88",
        "content": "Click here to win tiền ảo lừa đảo vay nhanh online..."
    }
    resp = client.post("/api/v1/ai/moderate", json=spam_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_safe"] is False
    assert data["verdict"] == "rejected"
    assert data["spam_score"] > 0.8
    assert len(data["reasons"]) > 0

    # Toxic
    toxic_payload = {
        "title": "Lập trình viên",
        "content": "Đoạn code này như đồ ngu, scam và chửi bới người khác..."
    }
    t_resp = client.post("/api/v1/ai/moderate", json=toxic_payload)
    assert t_resp.status_code == 200
    assert t_resp.json()["verdict"] == "rejected"


def test_ai_post_optimization(client: TestClient):
    payload = {
        "title": "Tối ưu hóa Docker container",
        "content": "Hướng dẫn multistage build trong Docker để giảm dung lượng image từ 1GB xuống còn 50MB."
    }
    resp = client.post("/api/v1/ai/optimize-post", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["suggested_titles"]) == 3
    assert "Docker" in data["seo_title"]
    assert len(data["meta_description"]) > 20
    assert "Docker" in data["suggested_tags"]
    assert data["suggested_category"] == "DevOps"
