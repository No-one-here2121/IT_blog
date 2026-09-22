import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.notification import Notification


def test_notifications_clear_all_and_delete_endpoints(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create two test notifications for the user
    notif1 = Notification(
        recipient_id=test_user.id,
        sender_id=test_user.id,
        type="comment",
        content="Một chuyên gia vừa phản hồi bài viết của bạn.",
        is_read=False
    )
    notif2 = Notification(
        recipient_id=test_user.id,
        sender_id=test_user.id,
        type="like",
        content="Có người thích câu trả lời của bạn.",
        is_read=False
    )
    db_session.add_all([notif1, notif2])
    db_session.commit()
    db_session.refresh(notif1)
    db_session.refresh(notif2)

    # 2. Check unread count
    resp = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["unread_count"] >= 2

    # 3. Delete single notification
    del_resp = client.delete(f"/api/v1/notifications/{notif1.id}", headers=headers)
    assert del_resp.status_code == 200
    assert "thành công" in del_resp.json()["message"]

    # Verify notif1 is deleted from DB
    check_notif1 = db_session.query(Notification).filter(Notification.id == notif1.id).first()
    assert check_notif1 is None

    # 4. Clear all notifications for user
    clear_resp = client.delete("/api/v1/notifications/clear-all", headers=headers)
    assert clear_resp.status_code == 200
    assert clear_resp.json()["deleted_count"] >= 1

    # 5. Check unread count is now 0
    resp_after = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert resp_after.status_code == 200
    assert resp_after.json()["unread_count"] == 0

    # 6. Delete non-existent notification returns 404
    not_found_resp = client.delete(f"/api/v1/notifications/{notif1.id}", headers=headers)
    assert not_found_resp.status_code == 404


def test_notifications_filter_unread(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create 1 read and 1 unread notification
    n_read = Notification(
        recipient_id=test_user.id,
        sender_id=test_user.id,
        type="system",
        content="Chào mừng bạn đến với IT Blog.",
        is_read=True
    )
    n_unread = Notification(
        recipient_id=test_user.id,
        sender_id=test_user.id,
        type="reply",
        content="Ai đó đã phản hồi thảo luận của bạn.",
        is_read=False
    )
    db_session.add_all([n_read, n_unread])
    db_session.commit()

    # Filter unread only
    resp = client.get("/api/v1/notifications?unread_only=true", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    items = data["items"]
    assert all(item["is_read"] is False for item in items)


def test_jobs_catalog_retrieval(client: TestClient):
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 200
    jobs = resp.json()
    assert isinstance(jobs, list)
    if len(jobs) > 0:
        j = jobs[0]
        assert "title" in j
        assert "company" in j or "company_name" in j
