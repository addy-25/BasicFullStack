# backend/tests/test_auth.py

def test_signup_success(client):
    res = client.post("/signup", json={
        "email": "new@example.com",
        "password": "password123"
    })
    assert res.status_code == 200
    assert res.json()["message"] == "User created"


def test_signup_duplicate_email(client, test_user):
    # test_user already has email "test@example.com"
    res = client.post("/signup", json={
        "email": "test@example.com",
        "password": "something"
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]


def test_login_success(client, test_user):
    res = client.post("/login", json={
        "email": "test@example.com",
        "password": "testpassword"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password(client, test_user):
    res = client.post("/login", json={
        "email": "test@example.com",
        "password": "wrongpassword"
    })
    assert res.status_code == 401


def test_login_nonexistent_user(client):
    res = client.post("/login", json={
        "email": "ghost@example.com",
        "password": "anything"
    })
    assert res.status_code == 401


def test_protected_route_without_token(client):
    res = client.get("/tasks")
    assert res.status_code == 401


def test_protected_route_with_token(client, auth_headers):
    res = client.get("/tasks", headers=auth_headers)
    assert res.status_code == 200   # returns empty list, not 401