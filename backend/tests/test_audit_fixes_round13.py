import pytest
from app.api.v1.crawler import trigger_crawl
from app.schemas.crawler import TriggerCrawlRequest
from app.models.user import User
from app.models.post import Post, PostStatus
from app.models.category import Category
from app.core.security import create_access_token


def test_trigger_crawl_without_user_dependency_does_not_crash(db_session):
    """Verify trigger_crawl handles current_user=None without AttributeError on Depends object."""
    req = TriggerCrawlRequest(source_id=None, limit=2, auto_publish=False)
    res = trigger_crawl(req=req, db=db_session, current_user=None)
    assert res is not None
    assert hasattr(res, "message")
    assert hasattr(res, "crawled_posts")


def test_ordinary_user_cannot_delete_other_user_post(client, db_session):
    """Ordinary user cannot delete post created by another user."""
    author = User(
        email="author_unique@itblog.dev",
        username="author_unique",
        name="Unique Author",
        hashed_password="hash",
        is_active=True,
        is_superuser=False
    )
    reg_user = User(
        email="reg_user@itblog.dev",
        username="reg_user",
        name="Regular User",
        hashed_password="hash",
        is_active=True,
        is_superuser=False
    )
    db_session.add_all([author, reg_user])
    db_session.commit()

    cat = db_session.query(Category).first()
    post = Post(
        title="Test Post By Author",
        slug="test-post-by-author",
        content="Content of post",
        category_id=cat.id if cat else 1,
        author_id=author.id,
        status=PostStatus.APPROVED.value
    )
    db_session.add(post)
    db_session.commit()

    token = create_access_token(subject=reg_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.delete(f"/api/v1/posts/{post.id}", headers=headers)
    assert response.status_code == 403
    assert "quyền" in response.json()["detail"].lower()


def test_admin_can_delete_any_post(client, db_session):
    """Admin can delete any post directly."""
    admin_user = User(
        email="admin_super@itblog.dev",
        username="admin_super",
        name="Super Admin",
        hashed_password="hash",
        is_active=True,
        is_superuser=True
    )
    db_session.add(admin_user)
    db_session.commit()

    cat = db_session.query(Category).first()
    other_post = Post(
        title="Post To Be Deleted By Admin",
        slug="post-to-be-deleted-by-admin",
        content="Some content",
        category_id=cat.id if cat else 1,
        author_id=9999,
        status=PostStatus.APPROVED.value
    )
    db_session.add(other_post)
    db_session.commit()

    admin_token = create_access_token(subject=admin_user.id)
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.delete(f"/api/v1/posts/{other_post.id}", headers=headers)
    assert response.status_code in [200, 204]
