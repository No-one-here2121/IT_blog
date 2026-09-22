def test_like_and_bookmark(client):
    # Register 2 users
    u1 = client.post("/api/v1/auth/register", json={
        "email": "user1@test.com", "username": "user1", "name": "User One", "password": "Password123!"
    }).json()
    u2 = client.post("/api/v1/auth/register", json={
        "email": "user2@test.com", "username": "user2", "name": "User Two", "password": "Password123!"
    }).json()

    h1 = {"Authorization": f"Bearer {u1['access_token']}"}
    h2 = {"Authorization": f"Bearer {u2['access_token']}"}

    # User 1 creates post
    post = client.post("/api/v1/posts", json={
        "title": "Bài viết test tương tác", "content": "Nội dung bài viết", "status": "approved"
    }, headers=h1).json()
    post_id = post["id"]

    # 1. User 2 likes post
    like_res = client.post(f"/api/v1/posts/{post_id}/like", headers=h2)
    assert like_res.status_code == 200
    assert like_res.json()["is_liked"] is True
    assert like_res.json()["likes_count"] == 1

    # User 2 un-likes post
    unlike_res = client.post(f"/api/v1/posts/{post_id}/like", headers=h2)
    assert unlike_res.status_code == 200
    assert unlike_res.json()["is_liked"] is False
    assert unlike_res.json()["likes_count"] == 0

    # 2. User 2 bookmarks post
    bm_res = client.post(f"/api/v1/posts/{post_id}/bookmark", headers=h2)
    assert bm_res.status_code == 200
    assert bm_res.json()["is_bookmarked"] is True

    # User 2 views bookmarks
    my_bm = client.get("/api/v1/users/me/bookmarks", headers=h2)
    assert my_bm.status_code == 200
    assert my_bm.json()["total"] == 1
    assert my_bm.json()["items"][0]["id"] == post_id

    # 3. User 2 follows User 1
    follow_res = client.post(f"/api/v1/users/{u1['user']['id']}/follow", headers=h2)
    assert follow_res.status_code == 200
    assert follow_res.json()["is_following"] is True
    assert follow_res.json()["followers_count"] == 1

    # Check followers of User 1
    followers = client.get(f"/api/v1/users/{u1['user']['id']}/followers")
    assert followers.status_code == 200
    assert followers.json()["total"] == 1
    assert followers.json()["items"][0]["username"] == "user2"
