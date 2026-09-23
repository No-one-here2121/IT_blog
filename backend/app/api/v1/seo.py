import html
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.post import Post, PostStatus
from app.models.category import Category
from app.models.tag import Tag

router = APIRouter(tags=["SEO & RSS"])


@router.get("/sitemap.xml")
def get_sitemap_xml(request: Request, db: Session = Depends(get_db)):
    """
    Section 15: XML Sitemap generation for search engines (Googlebot, Bingbot).
    """
    base_url = str(request.base_url).rstrip("/")
    now = datetime.now(timezone.utc)
    
    posts = (
        db.query(Post)
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .order_by(Post.created_at.desc())
        .limit(100)
        .all()
    )
    categories = db.query(Category).all()
    tags = db.query(Tag).limit(50).all()
    
    urls = [
        f"""  <url>
    <loc>{base_url}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>""",
        f"""  <url>
    <loc>{base_url}/roadmaps</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""",
        f"""  <url>
    <loc>{base_url}/courses</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""",
        f"""  <url>
    <loc>{base_url}/jobs</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>""",
        f"""  <url>
    <loc>{base_url}/events</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""",
        f"""  <url>
    <loc>{base_url}/leaderboard</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>"""
    ]
    
    for p in posts:
        slug = html.escape(p.slug)
        lastmod = (p.updated_at or p.created_at or datetime.now(timezone.utc)).strftime("%Y-%m-%d")
        urls.append(f"""  <url>
    <loc>{base_url}/posts/{slug}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>""")
        
    for c in categories:
        slug = html.escape(c.slug)
        urls.append(f"""  <url>
    <loc>{base_url}/category/{slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")

    for t in tags:
        slug = html.escape(t.slug)
        urls.append(f"""  <url>
    <loc>{base_url}/tag/{slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>""")

    sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>"""

    return Response(content=sitemap_content, media_type="application/xml")


@router.get("/robots.txt")
def get_robots_txt(request: Request):
    """
    Section 15: Standard robots.txt for search crawler guidance.
    """
    base_url = str(request.base_url).rstrip("/")
    robots_content = f"""User-agent: *
Allow: /
Disallow: /admin
Disallow: /moderation
Disallow: /api/

Sitemap: {base_url}/sitemap.xml
"""
    return Response(content=robots_content, media_type="text/plain")


@router.get("/feeds/rss")
@router.get("/rss.xml")
def get_rss_feed(request: Request, db: Session = Depends(get_db)):
    """
    Section 15: RSS 2.0 Technical News Feed for readers & aggregators.
    """
    base_url = str(request.base_url).rstrip("/")
    now = datetime.now(timezone.utc)
    posts = (
        db.query(Post)
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .order_by(Post.created_at.desc())
        .limit(20)
        .all()
    )
    
    items = []
    for p in posts:
        pub_date = (p.created_at or datetime.now(timezone.utc)).strftime("%a, %d %b %Y %H:%M:%S GMT")
        excerpt = html.escape(p.excerpt or p.title)
        title = html.escape(p.title)
        cat_name = html.escape(p.category.name if p.category else 'Tech')
        items.append(f"""    <item>
      <title>{title}</title>
      <link>{base_url}/posts/{html.escape(p.slug)}</link>
      <guid>{base_url}/posts/{html.escape(p.slug)}</guid>
      <pubDate>{pub_date}</pubDate>
      <description>{excerpt}</description>
      <category>{cat_name}</category>
    </item>""")

    rss_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>IT Blog Platform - Nền tảng chia sẻ kiến thức công nghệ</title>
    <link>{base_url}</link>
    <description>Bài viết chuyên sâu về Lập trình, AI, DevOps, Backend và Kiến trúc phần mềm.</description>
    <language>vi</language>
    <lastBuildDate>{datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")}</lastBuildDate>
{chr(10).join(items)}
  </channel>
</rss>"""

    return Response(content=rss_content, media_type="application/rss+xml")
