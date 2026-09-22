import pytest
from fastapi.testclient import TestClient
from app.services.gemini_service import GeminiService, GeminiKeyInfo, gemini_service


def test_gemini_service_key_pool():
    svc = GeminiService()
    
    # 1. Set multiple keys
    svc.set_keys(["AIzaSyKeyOne111111111111", "AIzaSyKeyTwo222222222222", "AIzaSyKeyThree3333333333"])
    assert len(svc.keys_pool) == 3

    # Check masking
    statuses = svc.get_keys_status()
    assert len(statuses) == 3
    assert statuses[0]["masked_key"].startswith("AIzaSy")
    assert statuses[0]["status"] == "active"
    assert statuses[0]["is_available"] is True

    # 2. Test round-robin key selection
    k1 = svc.get_next_key_info()
    k2 = svc.get_next_key_info()
    k3 = svc.get_next_key_info()
    k4 = svc.get_next_key_info()

    assert k1.key == "AIzaSyKeyOne111111111111"
    assert k2.key == "AIzaSyKeyTwo222222222222"
    assert k3.key == "AIzaSyKeyThree3333333333"
    assert k4.key == "AIzaSyKeyOne111111111111"  # Rotated back to start

    # 3. Simulate rate-limiting k2
    k2.status = "rate_limited"
    k2.rate_limited_until = 9999999999.0

    # Next available should skip k2
    selected = svc.get_next_key_info()
    assert selected.key in ["AIzaSyKeyOne111111111111", "AIzaSyKeyThree3333333333"]
    assert selected.key != "AIzaSyKeyTwo222222222222"

    # 4. Add key
    added = svc.add_key("AIzaSyKeyFour44444444444")
    assert added is True
    assert len(svc.keys_pool) == 4
    # Duplicate add
    assert svc.add_key("AIzaSyKeyFour44444444444") is False


def test_gemini_key_endpoints(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Update keys via endpoint
    new_keys = [
        "AIzaSyTestAlpha1234567890",
        "AIzaSyTestBeta0987654321"
    ]
    resp = client.post("/api/v1/ai/keys", json={"keys": new_keys}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_keys"] == 2
    assert data["active_keys"] == 2
    assert len(data["keys"]) == 2

    # 2. Get keys status
    get_resp = client.get("/api/v1/ai/keys")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["total_keys"] == 2
    assert get_data["keys"][0]["masked_key"].startswith("AIzaSy")

    # 3. Test key validation endpoint
    test_resp = client.post("/api/v1/ai/keys/test", json={"key": "invalid_test_key_xyz"})
    assert test_resp.status_code == 200
    test_data = test_resp.json()
    assert "valid" in test_data
    assert "message" in test_data


def test_ai_moderation_and_optimization_with_gemini(client: TestClient):
    # Test moderation for valid technical content
    mod_resp = client.post("/api/v1/ai/moderate", json={
        "title": "Xây dựng REST API với FastAPI và SQLAlchemy 2.0",
        "content": "Trong bài viết này, chúng ta sẽ tối ưu hóa hiệu năng truy vấn cơ sở dữ liệu PostgreSQL và cấu hình connection pool với Python."
    })
    assert mod_resp.status_code == 200
    mod_data = mod_resp.json()
    assert mod_data["is_safe"] is True
    assert mod_data["is_tech_related"] is True
    assert mod_data["verdict"] in ["approved", "flagged"]

    # Test moderation for spam
    spam_resp = client.post("/api/v1/ai/moderate", json={
        "title": "Chơi casino trực tuyến nhận tiền ngay",
        "content": "Đăng ký bet88 nhận ngay 100k trải nghiệm cá cược trực tuyến uy tín số 1."
    })
    assert spam_resp.status_code == 200
    spam_data = spam_resp.json()
    assert spam_data["is_safe"] is False
    assert spam_data["verdict"] == "rejected"
    assert len(spam_data["reasons"]) >= 1

    # Test optimization
    opt_resp = client.post("/api/v1/ai/optimize-post", json={
        "title": "Docker và Kubernetes",
        "content": "Hướng dẫn triển khai microservices lên cụm Kubernetes sử dụng Docker container và helm chart."
    })
    assert opt_resp.status_code == 200
    opt_data = opt_resp.json()
    assert len(opt_data["suggested_titles"]) >= 1
    assert "DevOps" in opt_data["suggested_category"] or "Backend" in opt_data["suggested_category"]
    assert len(opt_data["suggested_tags"]) >= 1
