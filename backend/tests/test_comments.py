def test_comments_and_threaded_replies(client):
    # Register author and commenter
    author = client.post("/api/v1/auth/register", json={
        "email": "cauthor@test.com", "username": "cauthor", "name": "Author", "password": "Password123!"
    }).json()
    commenter = client.post("/api/v1/auth/register", json={
        "email": "commenter@test.com", "username": "commenter", "name": "Commenter", "password": "Password123!"
    }).json()

    h_author = {"Authorization": f"Bearer {author['access_token']}"}
    h_commenter = {"Authorization": f"Bearer {commenter['access_token']}"}

    # Create post
    post = client.post("/api/v1/posts", json={
        "title": "Bài viết bàn luận", "content": "Nội dung", "status": "approved"
    }, headers=h_author).json()
    post_id = post["id"]

    # 1. Commenter creates root comment
    c1 = client.post(f"/api/v1/posts/{post_id}/comments", json={
        "content": "Bình luận đầu tiên của tôi!"
    }, headers=h_commenter)
    assert c1.status_code == 201
    c1_id = c1.json()["id"]

    # 2. Author replies to root comment (Threaded Reply)
    c2 = client.post(f"/api/v1/posts/{post_id}/comments", json={
        "content": "Cảm ơn bạn đã đọc bài viết!",
        "parent_id": c1_id
    }, headers=h_author)
    assert c2.status_code == 201
    assert c2.json()["parent_id"] == c1_id

    # 3. Get comments tree
    tree_res = client.get(f"/api/v1/posts/{post_id}/comments")
    assert tree_res.status_code == 200
    tree = tree_res.json()
    assert len(tree) == 1
    assert tree[0]["id"] == c1_id
    assert len(tree[0]["replies"]) == 1
    assert tree[0]["replies"][0]["content"] == "Cảm ơn bạn đã đọc bài viết!"

    # 4. Like comment
    like_res = client.post(f"/api/v1/comments/{c1_id}/like", headers=h_author)
    assert like_res.status_code == 200
    assert like_res.json()["is_liked"] is True
    assert like_res.json()["likes_count"] == 1

    # 5. Edit comment
    edit_res = client.put(f"/api/v1/comments/{c1_id}", json={
        "content": "Bình luận đã được cập nhật nội dung!"
    }, headers=h_commenter)
    assert edit_res.status_code == 200
    assert edit_res.json()["is_edited"] is True

    # 6. Delete reply
    del_res = client.delete(f"/api/v1/comments/{c2.json()['id']}", headers=h_author)
    assert del_res.status_code == 204
