from app.models.user import User


def test_notifications_and_moderation(client, db_session):
    # Register 2 users
    admin_user = client.post("/api/v1/auth/register", json={
        "email": "adminmod@test.com", "username": "adminmod", "name": "Admin Mod", "password": "Password123!"
    }).json()
    regular_user = client.post("/api/v1/auth/register", json={
        "email": "reguser@test.com", "username": "reguser", "name": "Reg User", "password": "Password123!"
    }).json()

    # Elevate admin_user to superuser in db
    u_admin = db_session.query(User).filter(User.id == admin_user["user"]["id"]).first()
    u_admin.is_superuser = True
    db_session.commit()

    h_admin = {"Authorization": f"Bearer {admin_user['access_token']}"}
    h_reg = {"Authorization": f"Bearer {regular_user['access_token']}"}

    # Regular user creates a post
    post = client.post("/api/v1/posts", json={
        "title": "Bài viết cần kiểm duyệt", "content": "Nội dung bài viết", "status": "approved"
    }, headers=h_reg).json()
    post_id = post["id"]

    # 1. Admin likes post -> generates notification for regular_user
    client.post(f"/api/v1/posts/{post_id}/like", headers=h_admin)

    # Regular user checks notifications
    notifs = client.get("/api/v1/notifications", headers=h_reg)
    assert notifs.status_code == 200
    assert notifs.json()["unread_count"] >= 1
    notif_id = notifs.json()["items"][0]["id"]

    # 2. Mark notification as read
    read_res = client.put(f"/api/v1/notifications/{notif_id}/read", headers=h_reg)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # 3. Regular user reports post
    rep_res = client.post("/api/v1/reports", json={
        "target_type": "post",
        "target_id": post_id,
        "reason": "spam",
        "details": "Nội dung quảng cáo không phù hợp"
    }, headers=h_reg)
    assert rep_res.status_code == 201
    assert rep_res.json()["reason"] == "spam"
    rep_id = rep_res.json()["id"]

    # 4. Check admin stats
    stats = client.get("/api/v1/admin/stats", headers=h_admin)
    assert stats.status_code == 200
    assert stats.json()["total_posts"] >= 1
    assert stats.json()["pending_reports_count"] >= 1

    # 5. Admin resolves report
    resolve_res = client.put(f"/api/v1/admin/reports/{rep_id}", json={
        "status": "resolved",
        "action": "none"
    }, headers=h_admin)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"

    # 6. Admin user management tests
    users_res = client.get("/api/v1/admin/users", headers=h_admin)
    assert users_res.status_code == 200
    assert len(users_res.json()) >= 2

    # Promote regular_user to moderator
    reg_id = regular_user["user"]["id"]
    role_res = client.put(f"/api/v1/admin/users/{reg_id}/role", json={"role": "moderator"}, headers=h_admin)
    assert role_res.status_code == 200
    assert role_res.json()["role"] == "moderator"

    # Toggle status
    status_res = client.put(f"/api/v1/admin/users/{reg_id}/status", json={"is_active": True}, headers=h_admin)
    assert status_res.status_code == 200
    assert status_res.json()["is_active"] is True
