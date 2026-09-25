import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup

from app.models.post import Post, PostStatus
from app.api.v1.article_extractor import (
    clean_inline_html,
    extract_cover_image,
    extract_full_article_from_url
)


def test_clean_inline_html():
    html_raw = "<span>Hello <strong>bold world</strong> with <code>variable_x</code> and <a href=\"/docs/guide\">link</a></span>"
    soup = BeautifulSoup(html_raw, "html.parser")
    md = clean_inline_html(soup.span, "https://example.com/base/")
    assert "**bold world**" in md
    assert "`variable_x`" in md
    assert "[link](https://example.com/docs/guide)" in md


def test_extract_cover_image_enclosure():
    import xml.etree.ElementTree as ET
    xml_str = """
    <item>
        <title>Test Item</title>
        <enclosure url="https://example.com/image.jpg" type="image/jpeg" />
    </item>
    """
    node = ET.fromstring(xml_str)
    img_url = extract_cover_image(node)
    assert img_url == "https://example.com/image.jpg"


def test_extract_full_article_fallback_on_invalid_url():
    res = extract_full_article_from_url("http://invalid-non-existent-domain-xyz.com/post")
    assert res["success"] is False
    assert res["content"] == ""


def test_crawler_enrich_post_endpoint(client: TestClient, db_session: Session, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create a post with short content and a valid source link (VnExpress article)
    sample_post = Post(
        title="Bài viết thử nghiệm crawl toàn văn",
        slug="bai-viet-thu-nghiem-crawl-toan-van",
        excerpt="Tóm tắt ngắn gọn",
        content="Nội dung tóm tắt ban đầu.\n\n---\n*Nguồn tin gốc: [Test](https://vnexpress.net/hon-5-000-ho-kinh-doanh-duoc-ho-tro-website-5123726.html)*",
        read_time="1 phút đọc",
        status=PostStatus.APPROVED.value,
        author_id=1,
        views=10
    )
    db_session.add(sample_post)
    db_session.commit()
    db_session.refresh(sample_post)

    # 2. Call enrich endpoint
    enrich_resp = client.post(f"/api/v1/crawler/enrich/{sample_post.id}", headers=headers)
    assert enrich_resp.status_code == 200
    data = enrich_resp.json()
    assert data["success"] is True
    assert data["content_length"] > 1000

    # 3. Verify in database
    updated = db_session.query(Post).filter(Post.id == sample_post.id).first()
    assert len(updated.content) > 1000
    assert "Đà Nẵng" in updated.content
    assert "*Nguồn tin gốc:" in updated.content


def test_crawler_enrich_all_endpoint(client: TestClient, db_session: Session, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    resp = client.post("/api/v1/crawler/enrich-all?limit=2", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "updated_posts" in data
