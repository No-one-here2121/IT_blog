# -*- coding: utf-8 -*-
import pytest
from app.models.user import User, Role
from app.models.moderation import BugReport, BugReportStatus
from app.core.security import create_access_token, get_password_hash


def test_bug_reports_lifecycle(client, db_session):
    # 1. Create admin user
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin")
        db_session.add(admin_role)
        db_session.commit()

    admin_user = User(
        username="admin_tester_bug",
        email="admin_tester_bug@itblog.vn",
        hashed_password=get_password_hash("Password123!"),
        name="Admin Tester",
        is_active=True,
        is_superuser=True
    )
    admin_user.roles.append(admin_role)
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)

    admin_token = create_access_token(subject=admin_user.id)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Public submission of bug report
    submit_payload = {
        "category": "bug",
        "priority": "high",
        "title": "Lỗi thanh tìm kiếm bị tràn",
        "description": "Khi thu nhỏ màn hình, thanh tìm kiếm đè lên các nút điều hướng.",
        "reporter_name": "Lê Văn Báo",
        "reporter_email": "bao@dev.vn"
    }
    res_submit = client.post("/api/v1/bug-reports", json=submit_payload)
    assert res_submit.status_code == 201
    bug_data = res_submit.json()
    assert bug_data["title"] == "Lỗi thanh tìm kiếm bị tràn"
    assert bug_data["status"] == "pending"
    assert bug_data["priority"] == "high"
    bug_id = bug_data["id"]

    # 3. Public get list
    res_list = client.get("/api/v1/bug-reports?category=bug")
    assert res_list.status_code == 200
    reports = res_list.json()
    assert any(b["id"] == bug_id for b in reports)

    # 4. Search filter
    res_search = client.get("/api/v1/bug-reports?search=thanh tìm kiếm")
    assert res_search.status_code == 200
    assert len(res_search.json()) >= 1

    # 5. Admin stats includes pending_bugs_count
    res_stats = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "pending_bugs_count" in stats
    assert stats["pending_bugs_count"] >= 1

    # 6. Admin lists reports
    res_admin_list = client.get("/api/v1/admin/bug-reports", headers=admin_headers)
    assert res_admin_list.status_code == 200
    assert any(b["id"] == bug_id for b in res_admin_list.json())

    # 7. Admin updates report to in_progress with notes
    res_update = client.put(
        f"/api/v1/admin/bug-reports/{bug_id}",
        json={
            "status": "in_progress",
            "admin_notes": "Đội FE đang xử lý điều chỉnh max-w và flex-shrink."
        },
        headers=admin_headers
    )
    assert res_update.status_code == 200
    updated = res_update.json()
    assert updated["status"] == "in_progress"
    assert "FE đang xử lý" in updated["admin_notes"]

    # 8. Admin resolves report
    res_resolve = client.put(
        f"/api/v1/admin/bug-reports/{bug_id}",
        json={
            "status": "resolved",
            "admin_notes": "Đã sửa xong trong commit mới."
        },
        headers=admin_headers
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "resolved"

    # 9. Admin deletes report
    res_del = client.delete(f"/api/v1/admin/bug-reports/{bug_id}", headers=admin_headers)
    assert res_del.status_code == 204

    # Verify deleted
    res_after = client.get("/api/v1/bug-reports")
    assert not any(b["id"] == bug_id for b in res_after.json())
