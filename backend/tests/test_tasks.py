# backend/tests/test_tasks.py

def test_create_task(client, auth_headers):
    res = client.post("/tasks", json={
        "title": "Buy groceries",
        "energy_level": "low"
    }, headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Buy groceries"
    assert data["energy_level"] == "low"
    assert data["completed"] == False
    assert data["priority_weight"] == 0.8    # PRIORITY_MAP["low"] = 0.8


def test_create_task_priority_mapping(client, auth_headers):
    # high energy → priority_weight 1.5
    res = client.post("/tasks", json={
        "title": "Urgent task",
        "energy_level": "high"
    }, headers=auth_headers)

    assert res.json()["priority_weight"] == 1.5


def test_get_tasks_empty(client, auth_headers):
    res = client.get("/tasks", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_get_tasks_returns_only_own(client, auth_headers, test_task):
    # test_task belongs to test_user
    res = client.get("/tasks", headers=auth_headers)
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "Test task"


def test_update_task(client, auth_headers, test_task):
    res = client.put(f"/tasks/{test_task.id}", json={
        "title": "Updated title",
        "energy_level": "high"
    }, headers=auth_headers)

    assert res.status_code == 200
    task = res.json()["task"]
    assert task["title"] == "Updated title"
    assert task["energy_level"] == "high"
    assert task["priority_weight"] == 1.5


def test_update_task_not_found(client, auth_headers):
    res = client.put("/tasks/9999", json={"title": "x"}, headers=auth_headers)
    assert res.status_code == 404


def test_complete_task_toggles(client, auth_headers, test_task):
    # First toggle — should be True
    res = client.patch(f"/tasks/{test_task.id}/complete", headers=auth_headers)
    assert res.json()["completed"] == True

    # Second toggle — should be False again
    res = client.patch(f"/tasks/{test_task.id}/complete", headers=auth_headers)
    assert res.json()["completed"] == False


def test_delete_task(client, auth_headers, test_task):
    res = client.delete(f"/tasks/{test_task.id}", headers=auth_headers)
    assert res.status_code == 200

    # Confirm it's gone
    res = client.get("/tasks", headers=auth_headers)
    assert res.json() == []


def test_cannot_access_other_users_task(client, test_task):
    # Creates a second user and try to delete test_user's task
    client.post("/signup", json={"email": "hacker@example.com", "password": "pass"})
    login_res = client.post("/login", json={"email": "hacker@example.com", "password": "pass"})
    other_token = login_res.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    res = client.delete(f"/tasks/{test_task.id}", headers=other_headers)
    assert res.status_code == 404   # not found for this user