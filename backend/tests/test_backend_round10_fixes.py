import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.post import Post, PostStatus
from app.models.user import User, Role
from app.models.comment import Comment
from app.models.moderation import Report, ReportStatus
from app.models.gamification import ReputationLog
from app.models.category import Category
from app.models.roadmap import Roadmap, RoadmapStep
from app.core.security import get_password_hash, create_access_token


def test_admin_update_role_validation_and_self_demotion(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    # Ensure test_user has admin role
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin", description="Admin")
        db_session.add(admin_role)
        db_session.flush()
    if admin_role not in test_user.roles:
        test_user.roles.append(admin_role)
        db_session.commit()

    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Admin attempts to demote self
    res_self = client.put(
        f"/api/v1/admin/users/{test_user.id}/role",
        json={"role": "user"},
        headers=headers
    )
    assert res_self.status_code == 400
    assert "không thể tự hạ cấp" in res_self.json()["detail"].lower()

    # Create target user
    target_user = User(
        email="target_user_round10@example.com",
        username="target_round10",
        name="Target Round 10",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add(target_user)
    db_session.commit()
    db_session.refresh(target_user)

    # 2. Admin attempts invalid role name
    res_invalid = client.put(
        f"/api/v1/admin/users/{target_user.id}/role",
        json={"role": "super_god_hacker"},
        headers=headers
    )
    assert res_invalid.status_code == 400
    assert "không hợp lệ" in res_invalid.json()["detail"].lower()

    # 3. Admin successfully updates target user role
    res_valid = client.put(
        f"/api/v1/admin/users/{target_user.id}/role",
        json={"role": "moderator"},
        headers=headers
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["role"] == "moderator"


def test_moderation_resolve_report_validation(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    # Ensure admin role
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if admin_role not in test_user.roles:
        test_user.roles.append(admin_role)
        db_session.commit()

    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create a dummy report
    report = Report(
        reporter_id=test_user.id,
        target_type="post",
        target_id=9999,
        reason="spam",
        details="Spam content report test",
        status=ReportStatus.PENDING.value
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)

    # 1. Invalid status
    res_bad_status = client.put(
        f"/api/v1/admin/reports/{report.id}",
        json={"status": "invalid_status", "action": "none"},
        headers=headers
    )
    assert res_bad_status.status_code == 400
    assert "trạng thái xử lý không hợp lệ" in res_bad_status.json()["detail"].lower()

    # 2. Invalid action
    res_bad_action = client.put(
        f"/api/v1/admin/reports/{report.id}",
        json={"status": "resolved", "action": "nuclear_strike"},
        headers=headers
    )
    assert res_bad_action.status_code == 400
    assert "hành động xử lý không hợp lệ" in res_bad_action.json()["detail"].lower()

    # 3. Valid status and action
    res_valid = client.put(
        f"/api/v1/admin/reports/{report.id}",
        json={"status": "resolved", "action": "none"},
        headers=headers
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["status"] == "resolved"


def test_comment_accepted_answer_reputation_and_deletion(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers_author = {"Authorization": f"Bearer {test_user_token}"}

    # Create commenter user
    commenter = User(
        email="commenter_round10@example.com",
        username="commenter_round10",
        name="Commenter Round 10",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add(commenter)
    db_session.commit()
    db_session.refresh(commenter)
    commenter_token = create_access_token(subject=commenter.id)
    headers_commenter = {"Authorization": f"Bearer {commenter_token}"}

    # Post author creates a post
    post_res = client.post("/api/v1/posts", headers=headers_author, json={
        "title": "Technical Q&A Post for Accepted Answer Test",
        "content": "How to resolve race conditions in SQLAlchemy?",
        "status": "approved"
    })
    assert post_res.status_code == 201
    post_id = post_res.json()["id"]

    # Commenter submits a high-value answer
    comment_res = client.post(f"/api/v1/posts/{post_id}/comments", headers=headers_commenter, json={
        "content": "Use SELECT FOR UPDATE with row-level locks or optimistic concurrency version column."
    })
    assert comment_res.status_code == 201
    comment_id = comment_res.json()["id"]

    # 1. Author marks answer as accepted
    accept_res = client.post(f"/api/v1/comments/{comment_id}/accept", headers=headers_author)
    assert accept_res.status_code == 200
    assert accept_res.json()["is_accepted_answer"] is True

    # Check commenter earned +20 reputation
    rep = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == commenter.id,
        ReputationLog.action == "accepted_answer",
        ReputationLog.reference_id == comment_id
    ).first()
    assert rep is not None
    assert rep.points == 20

    # 2. Author unmarks accepted answer -> reputation should be revoked
    unaccept_res = client.post(f"/api/v1/comments/{comment_id}/accept", headers=headers_author)
    assert unaccept_res.status_code == 200
    assert unaccept_res.json()["is_accepted_answer"] is False

    rep_revoked = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == commenter.id,
        ReputationLog.action == "accepted_answer",
        ReputationLog.reference_id == comment_id
    ).first()
    assert rep_revoked is None

    # 3. Re-mark accepted answer and then delete comment
    client.post(f"/api/v1/comments/{comment_id}/accept", headers=headers_author)
    del_res = client.delete(f"/api/v1/comments/{comment_id}", headers=headers_commenter)
    assert del_res.status_code == 204

    # Check reputation log was cleaned up
    rep_deleted = db_session.query(ReputationLog).filter(
        ReputationLog.reference_id == comment_id,
        ReputationLog.action == "accepted_answer"
    ).first()
    assert rep_deleted is None


def test_feeds_for_you_empty_page_fallback(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create a specific category
    cat = Category(name="Rust Systems", slug="rust-systems")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    # Create 1 post in this category and approve it
    post = Post(
        title="Rust Concurrency Guide",
        slug="rust-concurrency-guide-round10",
        content="Exploring Send, Sync and crossbeam channels in modern Rust.",
        category_id=cat.id,
        author_id=test_user.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # User likes this post so category is preferred
    client.post(f"/api/v1/posts/{post.id}/like", headers=headers)

    # Page 1 should return the post
    res_p1 = client.get("/api/v1/feeds/for-you?page=1&limit=5", headers=headers)
    assert res_p1.status_code == 200
    p1_data = res_p1.json()
    assert p1_data["total"] >= 1
    assert any(p["id"] == post.id for p in p1_data["items"])

    # Page 99 should return empty items and NOT fallback to general posts
    res_p99 = client.get("/api/v1/feeds/for-you?page=99&limit=5", headers=headers)
    assert res_p99.status_code == 200
    p99_data = res_p99.json()
    assert len(p99_data["items"]) == 0
    # Total count should reflect the preferred category posts, not all site posts
    assert p99_data["total"] == p1_data["total"]


def test_seo_rss_and_sitemap_escaping(
    client: TestClient,
    db_session: Session,
    test_user: User
):
    # Post with special XML characters
    special_title = 'React & Vue <DeepDive> "2026" & Next.js'
    post = Post(
        title=special_title,
        slug="react-vue-deepdive-2026-test",
        excerpt='Comparing "React" & <Vue> reactivity',
        content="Deep analysis of virtual DOM vs fine-grained signals.",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()

    # 1. RSS Feed
    rss_res = client.get("/api/v1/feeds/rss")
    assert rss_res.status_code == 200
    rss_text = rss_res.text
    assert "&amp;" in rss_text
    assert "&lt;DeepDive&gt;" in rss_text or "&lt;" in rss_text
    assert "<DeepDive>" not in rss_text  # Must NOT contain raw unescaped XML tag

    # 2. Sitemap
    sitemap_res = client.get("/api/v1/sitemap.xml")
    assert sitemap_res.status_code == 200
    assert "<?xml" in sitemap_res.text


def test_upload_image_mime_type_enforcement(
    client: TestClient,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Invalid MIME type (e.g. application/pdf)
    fake_pdf = io.BytesIO(b"%PDF-1.4 test content")
    res_bad_mime = client.post(
        "/api/v1/uploads/image",
        headers=headers,
        files={"file": ("test.pdf", fake_pdf, "application/pdf")}
    )
    assert res_bad_mime.status_code == 400

    # 2. Extension claims .png but MIME type is text/plain
    fake_txt = io.BytesIO(b"Hello world")
    res_spoofed = client.post(
        "/api/v1/uploads/image",
        headers=headers,
        files={"file": ("malicious.png", fake_txt, "text/plain")}
    )
    assert res_spoofed.status_code == 400
    assert "MIME type không hợp lệ" in res_spoofed.json()["detail"]

    # 3. Valid PNG upload
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"A" * 100)
    res_ok = client.post(
        "/api/v1/uploads/image",
        headers=headers,
        files={"file": ("avatar.png", fake_png, "image/png")}
    )
    assert res_ok.status_code == 200
    assert "url" in res_ok.json()


def test_get_my_bookmarks_filters_unpublished(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    # Create reader user
    reader = User(
        email="reader_round10@example.com",
        username="reader_round10",
        name="Reader Round 10",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add(reader)
    db_session.commit()
    db_session.refresh(reader)
    reader_token = create_access_token(subject=reader.id)
    headers_reader = {"Authorization": f"Bearer {reader_token}"}

    # Create approved post
    post = Post(
        title="Published Post for Bookmark Test",
        slug="published-post-bookmark-round10",
        content="Content of published post.",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # Reader bookmarks post
    bm_res = client.post(f"/api/v1/posts/{post.id}/bookmark", headers=headers_reader)
    assert bm_res.status_code == 200
    assert bm_res.json()["is_bookmarked"] is True

    # Reader verifies it's in their bookmarks
    my_bm1 = client.get("/api/v1/users/me/bookmarks", headers=headers_reader)
    assert my_bm1.status_code == 200
    assert any(p["id"] == post.id for p in my_bm1.json()["items"])

    # Post author reverts post to draft
    post.status = PostStatus.DRAFT.value
    db_session.commit()

    # Reader should NO LONGER see the draft post in their bookmarks
    my_bm2 = client.get("/api/v1/users/me/bookmarks", headers=headers_reader)
    assert my_bm2.status_code == 200
    assert not any(p["id"] == post.id for p in my_bm2.json()["items"])


def test_post_verify_reputation_revocation(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    # Ensure test_user is reviewer/moderator
    mod_role = db_session.query(Role).filter(Role.name == "moderator").first()
    if mod_role not in test_user.roles:
        test_user.roles.append(mod_role)
        db_session.commit()

    headers_mod = {"Authorization": f"Bearer {test_user_token}"}

    # Create post by author
    author = User(
        email="author_verify_round10@example.com",
        username="author_verify_round10",
        name="Author Verify Round 10",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add(author)
    db_session.commit()
    db_session.refresh(author)

    post = Post(
        title="Architecture Guide for Expert Verification",
        slug="arch-guide-expert-verify-round10",
        content="High-load architectural patterns.",
        author_id=author.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # 1. Verify post -> author earns +50 reputation
    res_verify = client.post(
        f"/api/v1/posts/{post.id}/verify",
        json={"is_verified": True, "verification_notes": "Expert approved"},
        headers=headers_mod
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["is_verified"] is True

    rep_entry = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == author.id,
        ReputationLog.action == "verified_post",
        ReputationLog.reference_id == post.id
    ).first()
    assert rep_entry is not None
    assert rep_entry.points == 50

    # 2. Un-verify post -> author's reputation log revoked
    res_unverify = client.post(
        f"/api/v1/posts/{post.id}/verify",
        json={"is_verified": False, "verification_notes": "Deprecating verification"},
        headers=headers_mod
    )
    assert res_unverify.status_code == 200
    assert res_unverify.json()["is_verified"] is False

    rep_revoked = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == author.id,
        ReputationLog.action == "verified_post",
        ReputationLog.reference_id == post.id
    ).first()
    assert rep_revoked is None


def test_delete_post_cleans_up_reports_and_roadmap_steps(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create post
    post = Post(
        title="Post Linked in Roadmap and Report",
        slug="post-linked-roadmap-report-round10",
        content="Content to be deleted.",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # Link in RoadmapStep
    roadmap = Roadmap(
        title="DevOps Roadmap",
        slug="devops-roadmap-round10",
        description="DevOps path",
        created_by_id=test_user.id
    )
    db_session.add(roadmap)
    db_session.flush()

    step = RoadmapStep(
        roadmap_id=roadmap.id,
        order_index=1,
        title="Read Post Step",
        post_id=post.id
    )
    db_session.add(step)

    # Link in Report
    report = Report(
        reporter_id=test_user.id,
        target_type="post",
        target_id=post.id,
        reason="spam"
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(step)
    db_session.refresh(report)

    step_id = step.id
    report_id = report.id

    # Delete the post
    del_res = client.delete(f"/api/v1/posts/{post.id}", headers=headers)
    assert del_res.status_code == 204

    # Check step's post_id is now None
    updated_step = db_session.query(RoadmapStep).filter(RoadmapStep.id == step_id).first()
    assert updated_step is not None
    assert updated_step.post_id is None

    # Check report was cleaned up
    report_exists = db_session.query(Report).filter(Report.id == report_id).first()
    assert report_exists is None
