def test_post_lifecycle(client):
    # 1. Register and get token
    reg_payload = {
        "email": "author@example.com",
        "username": "author_dev",
        "name": "Author Dev",
        "password": "Password123!"
    }
    auth_res = client.post("/api/v1/auth/register", json=reg_payload)
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Post
    post_payload = {
        "title": "Hướng dẫn làm chủ FastAPI và PostgreSQL",
        "category_name": "Backend",
        "tags": ["FastAPI", "Python", "PostgreSQL"],
        "excerpt": "Bài viết giới thiệu về FastAPI",
        "content": "# Tiêu đề\nNội dung bài viết chi tiết ở đây...",
        "status": "approved"
    }
    create_res = client.post("/api/v1/posts", json=post_payload, headers=headers)
    assert create_res.status_code == 201
    post_data = create_res.json()
    assert post_data["title"] == "Hướng dẫn làm chủ FastAPI và PostgreSQL"
    assert post_data["slug"] == "huong-dan-lam-chu-fastapi-va-postgresql"
    assert post_data["author"]["username"] == "author_dev"
    assert len(post_data["tags"]) == 3
    post_id = post_data["id"]

    # 3. Get Post Detail
    detail_res = client.get(f"/api/v1/posts/{post_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["views"] == 1  # Incremented views

    # 4. List Posts (with pagination)
    list_res = client.get("/api/v1/posts?page=1&limit=10")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1
    assert len(list_res.json()["items"]) >= 1

    # 5. Update Post
    update_payload = {
        "title": "Hướng dẫn làm chủ FastAPI và PostgreSQL (Cập nhật 2026)",
        "content": "Nội dung cập nhật mới"
    }
    update_res = client.put(f"/api/v1/posts/{post_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    assert "2026" in update_res.json()["title"]

    # 5.1 Test Related Videos (Section 26)
    videos_res = client.get(f"/api/v1/posts/{post_id}/videos")
    assert videos_res.status_code == 200
    videos = videos_res.json()
    assert isinstance(videos, list)
    assert len(videos) > 0
    assert "url" in videos[0]
    assert "duration" in videos[0]

    # 5.2 Test Engagement Bot comment (Section 25)
    bot_res = client.post(f"/api/v1/posts/{post_id}/bot-comment", headers=headers)
    assert bot_res.status_code == 200
    assert "AI TechBot" in bot_res.json()["content"]

    # 6. Delete Post
    del_res = client.delete(f"/api/v1/posts/{post_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify deleted
    verify_res = client.get(f"/api/v1/posts/{post_id}")
    assert verify_res.status_code == 404

