import base64
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


def test_call_gemini_uses_interactions_api(monkeypatch):
    request = {}

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "steps": [
                    {
                        "type": "model_output",
                        "content": [{"type": "text", "text": "AI learns patterns."}],
                    }
                ]
            }

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == 60.0

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, headers, json):
            request.update(url=url, headers=headers, json=json)
            return FakeResponse()

    monkeypatch.setattr("app.services.gemini_service.httpx.Client", FakeClient)
    svc = GeminiService()
    svc.model = "gemini-3.1-flash-lite"
    svc.set_keys(["test-api-key"])

    result = svc.call_gemini(
        "Explain how AI works",
        system_instruction="Be concise.",
        json_mode=True,
        temperature=0.4,
    )

    assert result == "AI learns patterns."
    assert request["url"] == "https://generativelanguage.googleapis.com/v1beta/interactions"
    assert request["headers"] == {
        "x-goog-api-key": "test-api-key",
        "Content-Type": "application/json",
        "Api-Revision": "2026-05-20",
    }
    assert request["json"]["model"] == "gemini-3.1-flash-lite"
    assert request["json"]["input"] == "Explain how AI works"
    assert "Be concise." in request["json"]["system_instruction"]
    assert request["json"]["generation_config"] == {"temperature": 0.4}


def test_generate_speech_uses_gemini_tts_interactions_api(monkeypatch):
    request = {}
    audio = b"RIFF\x00\x00\x00\x00WAVE"

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {"output_audio": {"data": base64.b64encode(audio).decode("ascii")}}

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == 120.0

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, headers, json):
            request.update(url=url, headers=headers, json=json)
            return FakeResponse()

    monkeypatch.setattr("app.services.gemini_service.httpx.Client", FakeClient)
    svc = GeminiService()
    svc.set_keys(["test-api-key"])

    result = svc.generate_speech("Xin chào, đây là bài viết công nghệ.")

    assert result == audio
    assert request["url"] == "https://generativelanguage.googleapis.com/v1beta/interactions"
    assert request["headers"]["x-goog-api-key"] == "test-api-key"
    assert request["json"]["model"] == "gemini-3.8-flash-tts"
    assert request["json"]["response_format"] == {"type": "audio"}
    assert request["json"]["generation_config"]["speech_config"] == [{"voice": "Kore"}]
    assert request["json"]["input"][0]["content"][0]["text"] == "Xin chào, đây là bài viết công nghệ."


def test_test_key_uses_interactions_api(monkeypatch):
    request = {}

    class FakeResponse:
        status_code = 200

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == 60.0

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, headers, json):
            request.update(url=url, headers=headers, json=json)
            return FakeResponse()

    monkeypatch.setattr("app.services.gemini_service.httpx.Client", FakeClient)
    svc = GeminiService()
    svc.model = "gemini-3.1-flash-lite"

    result = svc.test_key("test-api-key")

    assert result["valid"] is True
    assert request["url"] == "https://generativelanguage.googleapis.com/v1beta/interactions"
    assert request["headers"]["x-goog-api-key"] == "test-api-key"
    assert request["headers"]["Api-Revision"] == "2026-05-20"
    assert request["json"]["model"] == "gemini-3.1-flash-lite"
    assert request["json"]["input"] == "Hello, respond with 'OK' if you can read this."


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


def test_generate_speech_accepts_base64_with_whitespace_and_data_uri(monkeypatch):
    raw_audio = b"RIFF\x00\x00\x00\x00WAVE"
    encoded = "data:audio/wav;base64, " + "\n".join([
        base64.b64encode(raw_audio).decode("ascii")[:20],
        base64.b64encode(raw_audio).decode("ascii")[20:40],
        base64.b64encode(raw_audio).decode("ascii")[40:],
    ])

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {"output_audio": {"data": encoded}}

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == 120.0

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, headers, json):
            return FakeResponse()

    monkeypatch.setattr("app.services.gemini_service.httpx.Client", FakeClient)
    svc = GeminiService()
    svc.set_keys(["test-api-key"])

    result = svc.generate_speech("Xin chào")

    assert result == raw_audio


def test_read_article_returns_gemini_wav(client: TestClient, db_session, test_user, monkeypatch):
    from app.models.post import Post, PostStatus

    post = Post(
        title="Bài viết AI",
        slug="bai-viet-ai-doc",
        content="<p>Nội dung <strong>bài viết</strong>.</p>",
        excerpt="Mô tả bài viết",
        status=PostStatus.APPROVED.value,
        author_id=test_user.id,
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)
    monkeypatch.setattr(gemini_service, "keys_pool", [object()])
    monkeypatch.setattr(gemini_service, "generate_speech", lambda text: b"RIFF-audio")

    response = client.post("/api/v1/ai/read-article", json={"post_id": post.id})

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.content == b"RIFF-audio"


def test_read_article_hides_unpublished_post_from_anonymous_user(
    client: TestClient, db_session, test_user, monkeypatch
):
    from app.models.post import Post, PostStatus

    post = Post(
        title="Bản nháp",
        slug="ban-nhap-khong-cong-khai",
        content="Nội dung bản nháp",
        status=PostStatus.DRAFT.value,
        author_id=test_user.id,
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)
    monkeypatch.setattr(gemini_service, "keys_pool", [object()])
    called = False

    def unexpected_speech(_text):
        nonlocal called
        called = True
        return b"RIFF-audio"

    monkeypatch.setattr(gemini_service, "generate_speech", unexpected_speech)
    response = client.post("/api/v1/ai/read-article", json={"post_id": post.id})

    assert response.status_code == 404
    assert called is False


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
