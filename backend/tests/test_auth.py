def test_register_and_login(client):
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
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "testuser@example.com"
    assert data["user"]["username"] == "testuser"

    access_token = data["access_token"]

    # 2. Get Profile (/me)
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert res_me.status_code == 200
    assert res_me.json()["username"] == "testuser"

    # 3. Login with credentials
    login_payload = {
        "identifier": "testuser",
        "password": "SecretPassword123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()


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
