import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.post import Post, PostStatus
from app.models.user import User, Role
from app.models.comment import Comment
from app.models.gamification import ReputationLog
from app.models.interaction import Follow
from app.core.security import get_password_hash, create_access_token


def test_comment_accepted_answer_revokes_previous_author_reputation(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    """
    Test that toggling accepted answer from Comment A to Comment B cleanly
    revokes Comment A's author reputation and awards to Comment B's author without SAWarning.
    """
    headers_author = {"Authorization": f"Bearer {test_user_token}"}

    # Create 2 distinct comment authors
    author_a = User(
        email="author_a_r12@example.com",
        username="author_a_r12",
        name="Author A R12",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    author_b = User(
        email="author_b_r12@example.com",
        username="author_b_r12",
        name="Author B R12",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add_all([author_a, author_b])
    db_session.commit()
    db_session.refresh(author_a)
    db_session.refresh(author_b)

    # Post by test_user
    post = Post(
        title="Post For Accepted Answer Testing Round 12",
        slug="post-accepted-answer-testing-r12",
        content="Testing accepted answer switching and reputation revocation.",
        author_id=test_user.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # Comment A and Comment B
    comment_a = Comment(post_id=post.id, author_id=author_a.id, content="Solution A by Author A")
    comment_b = Comment(post_id=post.id, author_id=author_b.id, content="Solution B by Author B")
    db_session.add_all([comment_a, comment_b])
    db_session.commit()
    db_session.refresh(comment_a)
    db_session.refresh(comment_b)

    # 1. Author marks Comment A as accepted answer
    res_a = client.post(f"/api/v1/comments/{comment_a.id}/accept", headers=headers_author)
    assert res_a.status_code == 200
    assert res_a.json()["is_accepted_answer"] is True

    rep_a = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == author_a.id,
        ReputationLog.action == "accepted_answer",
        ReputationLog.reference_id == comment_a.id
    ).first()
    assert rep_a is not None
    assert rep_a.points == 20

    # 2. Author switches accepted answer to Comment B
    res_b = client.post(f"/api/v1/comments/{comment_b.id}/accept", headers=headers_author)
    assert res_b.status_code == 200
    assert res_b.json()["is_accepted_answer"] is True

    # Verify Comment A is no longer accepted and its reputation is revoked
    db_session.refresh(comment_a)
    assert comment_a.is_accepted_answer is False

    rep_a_revoked = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == author_a.id,
        ReputationLog.action == "accepted_answer",
        ReputationLog.reference_id == comment_a.id
    ).first()
    assert rep_a_revoked is None

    # Verify Comment B has the reputation awarded
    rep_b = db_session.query(ReputationLog).filter(
        ReputationLog.user_id == author_b.id,
        ReputationLog.action == "accepted_answer",
        ReputationLog.reference_id == comment_b.id
    ).first()
    assert rep_b is not None
    assert rep_b.points == 20


def test_comment_like_on_unpublished_post_rejected(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    """
    Test that liking a comment on a draft/unpublished post is rejected for normal users.
    """
    # Create draft post with comment
    draft_post = Post(
        title="Draft Post With Comments",
        slug="draft-post-with-comments-r12",
        content="Private draft content.",
        author_id=test_user.id,
        status=PostStatus.DRAFT.value
    )
    db_session.add(draft_post)
    db_session.commit()
    db_session.refresh(draft_post)

    comment = Comment(post_id=draft_post.id, author_id=test_user.id, content="Author draft note")
    db_session.add(comment)
    db_session.commit()
    db_session.refresh(comment)

    # Random other user attempts to like comment on draft post
    other_user = User(
        email="other_user_r12@example.com",
        username="other_r12",
        name="Other User",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    token_other = create_access_token(other_user.id)
    headers_other = {"Authorization": f"Bearer {token_other}"}

    res = client.post(f"/api/v1/comments/{comment.id}/like", headers=headers_other)
    assert res.status_code == 404


def test_post_create_and_update_duplicate_tags(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    """
    Test that submitting duplicate tags in create_post or update_post
    does not cause IntegrityError constraint violations.
    """
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create post with duplicate tags (case variations and duplicates)
    create_payload = {
        "title": "Clean Duplicate Tags Post R12",
        "content": "Testing tag deduplication on creation and update.",
        "tags": ["Python", "python", "#Python", "FastAPI", "FastAPI"]
    }
    res_create = client.post("/api/v1/posts", json=create_payload, headers=headers)
    assert res_create.status_code == 201
    post_data = res_create.json()
    post_id = post_data["id"]

    # Tags should be deduplicated to 2 tags ("python" and "fastapi")
    tag_names = [t["name"].lower() for t in post_data["tags"]]
    assert len(tag_names) == 2
    assert "python" in tag_names
    assert "fastapi" in tag_names

    # 2. Update post with duplicate tags
    update_payload = {
        "tags": ["Docker", "docker", "#docker", "Kubernetes", "kubernetes"]
    }
    res_update = client.put(f"/api/v1/posts/{post_id}", json=update_payload, headers=headers)
    assert res_update.status_code == 200
    updated_data = res_update.json()

    updated_tag_names = [t["name"].lower() for t in updated_data["tags"]]
    assert len(updated_tag_names) == 2
    assert "docker" in updated_tag_names
    assert "kubernetes" in updated_tag_names


def test_user_followers_and_following_inactive_checks(
    client: TestClient,
    db_session: Session,
    test_user: User,
    test_user_token: str
):
    """
    Test that followers and following endpoints return 404 for inactive users,
    and filter out inactive users from the returned list.
    """
    # Create active user and inactive user
    active_target = User(
        email="active_target_r12@example.com",
        username="active_target_r12",
        name="Active Target",
        hashed_password=get_password_hash("Password123!"),
        is_active=True
    )
    banned_user = User(
        email="banned_user_r12@example.com",
        username="banned_r12",
        name="Banned User",
        hashed_password=get_password_hash("Password123!"),
        is_active=False
    )
    db_session.add_all([active_target, banned_user])
    db_session.commit()
    db_session.refresh(active_target)
    db_session.refresh(banned_user)

    # 1. Query followers/following of an inactive user -> 404
    res_banned_followers = client.get(f"/api/v1/users/{banned_user.id}/followers")
    assert res_banned_followers.status_code == 404

    res_banned_following = client.get(f"/api/v1/users/{banned_user.id}/following")
    assert res_banned_following.status_code == 404

    # 2. Follow relationships: test_user (active) and banned_user follow active_target
    f1 = Follow(follower_id=test_user.id, following_id=active_target.id)
    f2 = Follow(follower_id=banned_user.id, following_id=active_target.id)
    db_session.add_all([f1, f2])
    db_session.commit()

    # Query active_target followers -> should only contain test_user, not banned_user
    res_followers = client.get(f"/api/v1/users/{active_target.id}/followers")
    assert res_followers.status_code == 200
    followers_data = res_followers.json()
    assert followers_data["total"] == 1
    assert followers_data["items"][0]["id"] == test_user.id


def test_auth_register_username_validation_and_clean_password(
    client: TestClient,
    db_session: Session
):
    """
    Test that username with invalid characters (spaces, slashes) is rejected with 400,
    and valid registration works properly.
    """
    # 1. Username with spaces
    res_space = client.post(
        "/api/v1/auth/register",
        json={
            "email": "invalid_user1@example.com",
            "username": "user name with space",
            "name": "Invalid User",
            "password": "Password123!"
        }
    )
    assert res_space.status_code == 400
    assert "chỉ được chứa" in res_space.json()["detail"].lower()

    # 2. Username with slash
    res_slash = client.post(
        "/api/v1/auth/register",
        json={
            "email": "invalid_user2@example.com",
            "username": "user/slash",
            "name": "Invalid User",
            "password": "Password123!"
        }
    )
    assert res_slash.status_code == 400
    assert "chỉ được chứa" in res_slash.json()["detail"].lower()

    # 3. Valid username with allowed characters (dots, hyphens, underscores)
    res_valid = client.post(
        "/api/v1/auth/register",
        json={
            "email": "valid_user_r12@example.com",
            "username": "john.doe_dev-99",
            "name": "John Doe",
            "password": "   SecurePass123!   "
        }
    )
    assert res_valid.status_code == 201
    assert res_valid.json()["user"]["username"] == "john.doe_dev-99"
