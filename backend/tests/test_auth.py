def test_register_and_login(client, db_session):
    from app.models.user import User

    # 1. Register new user
    reg_payload = {
        "email": "testuser@example.com",
        "username": "testuser",
        "name": "Test User",
        "password": "SecretPassword123!"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["pending_approval"] is True
    assert data["user"]["email"] == "testuser@example.com"
    assert data["user"]["username"] == "testuser"

    # Newly registered user is inactive pending admin approval
    u = db_session.query(User).filter(User.username == "testuser").first()
    assert u is not None
    assert u.is_active is False

    # Admin approves user
    u.is_active = True
    db_session.commit()

    # 2. Login with credentials
    login_payload = {
        "identifier": "testuser",
        "password": "SecretPassword123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data
    access_token = login_data["access_token"]

    # 3. Get Profile (/me)
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert res_me.status_code == 200
    assert res_me.json()["username"] == "testuser"


def test_register_duplicate_email(client):
    reg_payload = {
        "email": "dup@example.com",
        "username": "dupuser",
        "name": "Duplicate User",
        "password": "SecretPassword123!"
    }
    res1 = client.post("/api/v1/auth/register", json=reg_payload)
    assert res1.status_code == 201

    # Try duplicate email with different username
    reg_payload2 = {
        "email": "dup@example.com",
        "username": "anotheruser",
        "name": "Another User",
        "password": "SecretPassword123!"
    }
    res2 = client.post("/api/v1/auth/register", json=reg_payload2)
    assert res2.status_code == 400
