from datetime import datetime, timezone, timedelta
import pytest
from jose import jwt
from app.core.config import settings
from app.models.post import Post, PostStatus


def test_deps_malformed_token_sub_handled_safely(client):
    """
    Test that an access token with non-numeric 'sub' (e.g. string uuid or external id)
    is handled safely without causing a 500 ValueError.
    """
    to_encode = {
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "sub": "non_numeric_uuid_sub",
        "type": "access"
    }
    fake_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    headers = {"Authorization": f"Bearer {fake_token}"}

    # Calling an endpoint that uses get_current_user_optional
    res = client.get("/api/v1/posts", headers=headers)
    assert res.status_code == 200


def test_register_username_and_password_validation(client):
    """
    Test that registration rejects short usernames (<3 chars) and short passwords (<6 chars).
    """
    # 1. Short username
    res1 = client.post("/api/v1/auth/register", json={
        "email": "short_user@example.com",
        "username": "ab",
        "name": "Short User",
        "password": "ValidPassword123"
    })
    assert res1.status_code == 400
    assert "3 ký tự" in res1.json()["detail"]

    # 2. Short password
    res2 = client.post("/api/v1/auth/register", json={
        "email": "short_pwd@example.com",
        "username": "valid_user",
        "name": "Short Password User",
        "password": "123"
    })
    assert res2.status_code == 400
    assert "6 ký tự" in res2.json()["detail"]


def test_refresh_token_malformed_sub_handled_safely(client):
    """
    Test that a refresh token with non-numeric 'sub' returns 401 instead of crashing with 500.
    """
    to_encode = {
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "sub": "not_an_int",
        "type": "refresh"
    }
    fake_refresh_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    res = client.post("/api/v1/auth/refresh", json={"refresh_token": fake_refresh_token})
    assert res.status_code == 401


def test_comment_empty_content_rejected(client):
    """
    Test that blank or whitespace-only comments are rejected on creation and update.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "comment_user@example.com",
        "username": "comment_user",
        "name": "Comment User",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Post for Empty Comment Test",
        "content": "Valid content body here.",
        "status": "approved"
    })
    post_id = post_res.json()["id"]

    # 1. Create blank comment
    res_blank = client.post(f"/api/v1/posts/{post_id}/comments", headers=headers, json={
        "content": "    "
    })
    assert res_blank.status_code == 400

    # 2. Create valid comment
    res_valid = client.post(f"/api/v1/posts/{post_id}/comments", headers=headers, json={
        "content": "Valid comment message."
    })
    assert res_valid.status_code == 201
    c_id = res_valid.json()["id"]

    # 3. Update comment to blank
    res_up_blank = client.put(f"/api/v1/comments/{c_id}", headers=headers, json={
        "content": "   "
    })
    assert res_up_blank.status_code == 400


def test_post_empty_title_content_rejected(client):
    """
    Test that posts with blank titles or empty content are rejected with 400.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "post_author_val@example.com",
        "username": "author_val",
        "name": "Author Validation",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Blank title
    res1 = client.post("/api/v1/posts", headers=headers, json={
        "title": "   ",
        "content": "Valid content"
    })
    assert res1.status_code == 400

    # Blank content
    res2 = client.post("/api/v1/posts", headers=headers, json={
        "title": "Valid Title",
        "content": "   "
    })
    assert res2.status_code == 400


def test_post_future_scheduled_hidden_from_public(client):
    """
    Test that posts scheduled in the future are not exposed to the public
    in approved posts listing.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "scheduled_author@example.com",
        "username": "scheduled_author",
        "name": "Scheduled Author",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post scheduled tomorrow
    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    post_res = client.post("/api/v1/posts", headers=headers, json={
        "title": "Exclusive Future Post Announcement",
        "content": "This post should only be visible when its scheduled time arrives.",
        "status": "approved",
        "scheduled_at": future_time
    })
    assert post_res.status_code == 201
    post_id = post_res.json()["id"]

    # Public list of approved posts should not include this post
    posts_list = client.get("/api/v1/posts?status_filter=approved")
    assert posts_list.status_code == 200
    items = posts_list.json()["items"]
    assert not any(p["id"] == post_id for p in items)


def test_upload_empty_file_rejected(client):
    """
    Test that uploading an empty (0 bytes) file is rejected with 400.
    """
    reg = client.post("/api/v1/auth/register", json={
        "email": "uploader_val@example.com",
        "username": "uploader_val",
        "name": "Uploader Val",
        "password": "Password123"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upload empty bytes
    files = {"file": ("empty.png", b"", "image/png")}
    res = client.post("/api/v1/uploads/image", headers=headers, files=files)
    assert res.status_code == 400
    assert "rỗng" in res.json()["detail"].lower()


def test_leaderboard_limit_validation(client):
    """
    Test that leaderboard limit param validates ge=1 and le=100.
    """
    # limit = 0 should return 422
    res_bad = client.get("/api/v1/gamification/leaderboard?limit=0")
    assert res_bad.status_code == 422

    # limit = 5 should return 200
    res_good = client.get("/api/v1/gamification/leaderboard?limit=5")
    assert res_good.status_code == 200
    assert len(res_good.json()) <= 5
