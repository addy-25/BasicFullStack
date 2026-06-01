# backend/tests/test_notifications.py

from tests.conftest import TestingSessionLocal
from models import IntegrationItem, IntegrationConnection
from datetime import datetime, timezone


def make_inbox_item(owner_id, title="Fix bug #1", source_id="101"):
    """Helper — inserts an inbox item directly into test DB"""
    db = TestingSessionLocal()
    item = IntegrationItem(
        owner_id=owner_id,
        source="github",
        source_id=source_id,
        source_url="https://github.com/repo/issues/1",
        title=title,
        body="This is broken",
        suggested_energy="high",
        status="inbox",
        received_at=datetime.now(timezone.utc)
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    db.close()
    return item


def test_inbox_empty(client, auth_headers):
    res = client.get("/notifications?status=inbox", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_inbox_shows_items(client, auth_headers, test_user):
    make_inbox_item(test_user.id)
    res = client.get("/notifications?status=inbox", headers=auth_headers)
    assert len(res.json()) == 1
    assert res.json()[0]["source"] == "github"
    assert res.json()[0]["title"] == "Fix bug #1"


def test_accept_notification_creates_task(client, auth_headers, test_user):
    item = make_inbox_item(test_user.id)

    res = client.post(f"/notifications/{item.id}/accept", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["task"]["title"] == "Fix bug #1"
    assert res.json()["task"]["energy_level"] == "high"

    # Item should no longer appear in inbox
    inbox = client.get("/notifications?status=inbox", headers=auth_headers)
    assert inbox.json() == []


def test_accept_already_accepted(client, auth_headers, test_user):
    item = make_inbox_item(test_user.id)
    client.post(f"/notifications/{item.id}/accept", headers=auth_headers)

    # Try accepting again
    res = client.post(f"/notifications/{item.id}/accept", headers=auth_headers)
    assert res.status_code == 400
    assert "Already accepted" in res.json()["detail"]


def test_dismiss_notification(client, auth_headers, test_user):
    item = make_inbox_item(test_user.id)

    res = client.post(f"/notifications/{item.id}/dismiss", headers=auth_headers)
    assert res.status_code == 200

    # Should be gone from inbox
    inbox = client.get("/notifications?status=inbox", headers=auth_headers)
    assert inbox.json() == []