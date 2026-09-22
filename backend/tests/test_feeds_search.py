def test_feeds_and_search(client):
    # Register author
    u = client.post("/api/v1/auth/register", json={
        "email": "feedauthor@test.com", "username": "feedauthor", "name": "Feed Author", "password": "Password123!"
    }).json()
    h = {"Authorization": f"Bearer {u['access_token']}"}

    # Create distinct posts
    p1 = client.post("/api/v1/posts", json={
        "title": "Học Lập Trình Python Toàn Tập",
        "category_name": "Backend",
        "tags": ["Python", "FastAPI"],
        "content": "Python là ngôn ngữ rất phổ biến",
        "status": "approved"
    }, headers=h).json()

    p2 = client.post("/api/v1/posts", json={
        "title": "React 19 Cơ Bản Đến Nâng Cao",
        "category_name": "Frontend",
        "tags": ["React"],
        "content": "React là thư viện xây dựng giao diện",
        "status": "approved"
    }, headers=h).json()

    # 1. Trending Feed
    trend = client.get("/api/v1/feeds/trending")
    assert trend.status_code == 200
    assert len(trend.json()) >= 2

    # 2. For You Feed
    foryou = client.get("/api/v1/feeds/for-you", headers=h)
    assert foryou.status_code == 200
    assert foryou.json()["total"] >= 2

    # 3. Related Posts
    related = client.get(f"/api/v1/posts/{p1['id']}/related")
    assert related.status_code == 200
    assert isinstance(related.json(), list)

    # 4. Search Query
    search_py = client.get("/api/v1/search?q=Python")
    assert search_py.status_code == 200
    assert search_py.json()["total"] >= 1
    assert "Python" in search_py.json()["items"][0]["title"]
