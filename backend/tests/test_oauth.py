import pytest
from fastapi.testclient import TestClient

def test_oauth_authorize_urls(client: TestClient):
    for provider in ["google", "github", "facebook"]:
        resp = client.get(f"/api/v1/auth/oauth/{provider}/authorize")
        assert resp.status_code == 200
        data = resp.json()
        assert data["provider"] == provider
        assert "authorize_url" in data
        assert len(data["authorize_url"]) > 20

def test_oauth_register_and_login_flow(client: TestClient):
    # 1. Register new user via Google OAuth
    payload_google = {
        "provider": "google",
        "email": "auto_test_coder@gmail.com",
        "name": "Auto Test Coder",
        "avatar": "https://lh3.googleusercontent.com/test_avatar"
    }
    resp1 = client.post("/api/v1/auth/oauth/google", json=payload_google)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert "access_token" in data1
    assert "refresh_token" in data1
    assert data1["user"]["email"] == "auto_test_coder@gmail.com"
    assert data1["user"]["name"] == "Auto Test Coder"

    # 2. Login again with same Google OAuth (should recognize existing user)
    resp2 = client.post("/api/v1/auth/oauth/google", json=payload_google)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["user"]["id"] == data1["user"]["id"]

    # 3. Access authenticated route with the returned JWT token
    token = data1["access_token"]
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "auto_test_coder@gmail.com"

def test_oauth_github_and_facebook(client: TestClient):
    resp_gh = client.post("/api/v1/auth/oauth/github", json={
        "provider": "github",
        "email": "auto_gh_user@itblog.vn",
        "name": "GitHub Engineer VN"
    })
    assert resp_gh.status_code == 200
    assert resp_gh.json()["user"]["email"] == "auto_gh_user@itblog.vn"

    resp_fb = client.post("/api/v1/auth/oauth/facebook", json={
        "provider": "facebook",
        "email": "auto_fb_user@itblog.vn",
        "name": "Facebook Developer VN"
    })
    assert resp_fb.status_code == 200
    assert resp_fb.json()["user"]["email"] == "auto_fb_user@itblog.vn"

def test_oauth_invalid_provider(client: TestClient):
    resp = client.post("/api/v1/auth/oauth/invalid_provider", json={
        "provider": "invalid_provider",
        "email": "invalid@domain.com"
    })
    assert resp.status_code == 400
