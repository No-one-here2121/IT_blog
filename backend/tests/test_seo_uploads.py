import io
import pytest
from fastapi.testclient import TestClient


def test_seo_and_rss_endpoints(client: TestClient):
    # Test sitemap XML
    sitemap_res = client.get("/sitemap.xml")
    assert sitemap_res.status_code == 200
    assert "application/xml" in sitemap_res.headers["content-type"]
    assert "<urlset" in sitemap_res.text
    assert "<loc>" in sitemap_res.text

    # Test robots.txt
    robots_res = client.get("/robots.txt")
    assert robots_res.status_code == 200
    assert "text/plain" in robots_res.headers["content-type"]
    assert "User-agent: *" in robots_res.text
    assert "Sitemap:" in robots_res.text

    # Test RSS feed
    rss_res = client.get("/rss.xml")
    assert rss_res.status_code == 200
    assert "application/rss+xml" in rss_res.headers["content-type"]
    assert "<rss version=\"2.0\"" in rss_res.text
    assert "<channel>" in rss_res.text

    # Test API prefix endpoints
    api_sitemap = client.get("/api/v1/sitemap.xml")
    assert api_sitemap.status_code == 200

    api_rss = client.get("/api/v1/feeds/rss")
    assert api_rss.status_code == 200


def test_secure_image_upload(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    # 1. Reject unauthenticated upload
    unauth_res = client.post("/api/v1/uploads/image", files={"file": ("test.png", b"fakecontent", "image/png")})
    assert unauth_res.status_code == 401

    # 2. Reject disallowed extension
    bad_ext_res = client.post(
        "/api/v1/uploads/image",
        files={"file": ("malicious.exe", b"binarydata", "application/x-msdownload")},
        headers=headers
    )
    assert bad_ext_res.status_code == 400
    assert "không được hỗ trợ" in bad_ext_res.json()["detail"]

    # 3. Reject oversized file (> 5MB)
    huge_data = b"0" * (5 * 1024 * 1024 + 1024)
    oversized_res = client.post(
        "/api/v1/uploads/image",
        files={"file": ("huge.jpg", huge_data, "image/jpeg")},
        headers=headers
    )
    assert oversized_res.status_code == 413

    # 4. Successful upload with valid image
    fake_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    valid_res = client.post(
        "/api/v1/uploads/image",
        files={"file": ("tech_banner.png", fake_png, "image/png")},
        headers=headers
    )
    assert valid_res.status_code == 200
    data = valid_res.json()
    assert data["url"].startswith("/uploads/")
    assert data["filename"].endswith(".png")
    assert data["original_name"] == "tech_banner.png"
