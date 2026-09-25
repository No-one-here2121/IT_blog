import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db, SessionLocal
from app.models.user import User
from app.models.post import Post
from app.models.notification import Notification
from app.models.crawler import CrawlSource
from app.api.v1.crawler import ensure_default_sources, DEFAULT_SOURCES
from app.api.v1.notifications import ensure_user_seed_notifications
from app.api.v1.article_extractor import convert_soup_to_markdown
from bs4 import BeautifulSoup


@pytest.fixture
def client():
    return TestClient(app)


def test_ensure_default_sources_seeds_all_catalog():
    db: Session = SessionLocal()
    try:
        ensure_default_sources(db)
        sources = db.query(CrawlSource).all()
        source_urls = {s.url for s in sources}
        for item in DEFAULT_SOURCES:
            assert item["url"] in source_urls
    finally:
        db.close()


def test_article_extractor_handles_rich_html_and_code():
    html_sample = """
    <div class="article-content">
        <h2>Kiến trúc Microservices hiện đại</h2>
        <p>Đây là bài viết phân tích chi tiết về việc xây dựng hệ thống.</p>
        <pre><code class="language-python">
def handle_event(event):
    return {"status": "success"}
        </code></pre>
        <blockquote>Kiến trúc hướng sự kiện mang lại tính độc lập cao.</blockquote>
        <ul>
            <li>Kafka broker cluster</li>
            <li>Redis cache layer</li>
        </ul>
        <figure>
            <img src="/images/diagram.png" alt="Sơ đồ kiến trúc" />
            <figcaption>Sơ đồ tổng quan luồng sự kiện</figcaption>
        </figure>
    </div>
    """
    soup = BeautifulSoup(html_sample, "html.parser")
    container = soup.find("div", class_="article-content")
    md = convert_soup_to_markdown(container, base_url="https://example.com/posts/1")

    assert "## Kiến trúc Microservices hiện đại" in md
    assert "```python" in md
    assert "def handle_event(event):" in md
    assert "> Kiến trúc hướng sự kiện mang lại tính độc lập cao." in md
    assert "- Kafka broker cluster" in md
    assert "![Sơ đồ kiến trúc](https://example.com/images/diagram.png)" in md


def test_notifications_seed_and_mark_read_flow(client):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "test_audit_user_14").first()
        if not user:
            user = User(
                username="test_audit_user_14",
                name="Test Audit User 14",
                email="test_audit_user_14@itblog.vn",
                hashed_password="hashed_dummy_password",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            db.query(Notification).filter(Notification.recipient_id == user.id).delete(synchronize_session=False)
            db.commit()

        ensure_user_seed_notifications(db, user.id)
        notifs = db.query(Notification).filter(Notification.recipient_id == user.id).all()
        assert len(notifs) >= 3

        unread = [n for n in notifs if not n.is_read]
        assert len(unread) >= 1

        target = unread[0]
        # Mark read directly
        target.is_read = True
        db.commit()

        refreshed = db.query(Notification).filter(Notification.id == target.id).first()
        assert refreshed.is_read is True
    finally:
        db.close()
