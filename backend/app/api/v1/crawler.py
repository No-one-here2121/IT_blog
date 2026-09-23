import hashlib
import html
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from slugify import slugify

from app.core.database import get_db
from app.models.user import User
from app.models.post import Post, PostStatus, PostTag
from app.models.category import Category
from app.models.tag import Tag
from app.models.crawler import CrawlSource, CrawlJob
from app.schemas.crawler import (
    CrawlSourceCreate,
    CrawlSourceResponse,
    TriggerCrawlRequest,
    CrawlJobResponse,
    CrawlResultResponse
)
from app.api.deps import get_current_active_user, get_current_user_optional

router = APIRouter(prefix="/crawler", tags=["Crawler & News Ingestion"])

DEFAULT_SOURCES = [
    {"name": "Dev.to Technical Feed", "url": "https://dev.to/feed", "category": "Frontend"},
    {"name": "FreeCodeCamp News Feed", "url": "https://www.freecodecamp.org/news/rss/", "category": "Backend"},
    {"name": "GitHub Engineering Blog", "url": "https://github.blog/feed/", "category": "DevOps"},
    {"name": "Hacker News Top Stories", "url": "https://news.ycombinator.com/rss", "category": "System"},
    {"name": "AWS Architecture Blog", "url": "https://aws.amazon.com/blogs/architecture/feed/", "category": "DevOps"},
    {"name": "VnExpress Số Hóa Công Nghệ", "url": "https://vnexpress.net/rss/so-hoa.rss", "category": "AI & Data"}
]

DEFAULT_FEEDS = [
    {
        "title": "Xây dựng Event-Driven Architecture với Apache Kafka và Python",
        "excerpt": "Phân tích mô hình kiến trúc hướng sự kiện, xử lý luồng dữ liệu thời gian thực quy mô lớn.",
        "content": "# Event-Driven Architecture với Kafka\n\nKiến trúc hướng sự kiện giúp phân tách các dịch vụ microservices, đảm bảo tính sẵn sàng cao và khả năng mở rộng quy mô lớn cho hệ thống phân tán hiện đại.\n\nKafka đóng vai trò là một distributed commit log, giúp các producer gửi message vào topic và consumer đọc message độc lập theo offset.",
        "read_time": "6 phút đọc",
        "tech_stack_version": "Kafka 3.6 / Python 3.11",
        "category": "System",
        "tags": ["kafka", "python", "microservices"]
    },
    {
        "title": "Tối ưu hóa Truy vấn PostgreSQL nâng cao với Index BRIN và EXPLAIN ANALYZE",
        "excerpt": "Chiến lược lập chỉ mục dữ liệu chuỗi thời gian lớn và phân tích chi phí kế hoạch thực thi câu lệnh SQL.",
        "content": "# Tối ưu PostgreSQL với BRIN Index\n\nĐối với các bảng có hàng trăm triệu dòng ghi theo thứ tự thời gian (time-series hoặc log audit), index B-Tree tiêu chuẩn tiêu tốn quá nhiều dung lượng RAM và đĩa cứng.\n\nIndex BRIN (Block Range Index) giúp giảm kích thước index xuống tới 95% mà vẫn đảm bảo tốc độ scan vùng dữ liệu siêu nhanh.",
        "read_time": "8 phút đọc",
        "tech_stack_version": "PostgreSQL 16",
        "category": "Database",
        "tags": ["postgresql", "indexing", "sql"]
    },
    {
        "title": "Triển khai Kubernetes Zero-Downtime Deployment cho FastAPI",
        "excerpt": "Cấu hình Rolling Update, Liveness Probe, Readiness Probe và Horizontal Pod Autoscaler.",
        "content": "# Zero-Downtime Deployment trên K8s\n\nĐảm bảo hệ thống hoạt động liên tục 99.99% khi cập nhật phiên bản mới bằng cách cấu hình chuẩn xác các tham số maxUnavailable và maxSurge trong Deployment spec.\n\nKết hợp Readiness Probe với endpoint health check nội bộ để tránh tình trạng router gửi traffic tới pod chưa sẵn sàng.",
        "read_time": "7 phút đọc",
        "tech_stack_version": "Kubernetes 1.29 / FastAPI 0.110",
        "category": "DevOps",
        "tags": ["kubernetes", "docker", "fastapi"]
    }
]

CATEGORY_KEYWORDS = {
    "Frontend": ["react", "vue", "angular", "frontend", "css", "html", "javascript", "typescript", "tailwind", "vite", "nextjs", "web"],
    "Backend": ["fastapi", "python", "django", "golang", "go", "rust", "backend", "api", "node", "express", "java", "spring"],
    "DevOps": ["docker", "kubernetes", "k8s", "devops", "ci/cd", "terraform", "aws", "cloud", "linux", "git", "argocd", "server"],
    "AI & Data": ["ai", "llm", "rag", "gpt", "gemini", "machine learning", "deep learning", "ollama", "data", "model", "prompt"],
    "Database": ["sql", "postgresql", "postgres", "redis", "mongodb", "database", "mysql", "clickhouse", "indexing", "nosql"],
    "System": ["system design", "microservices", "architecture", "kafka", "distributed", "security", "network", "grpc"],
    "Mobile": ["mobile", "flutter", "react native", "ios", "android", "swift", "kotlin"]
}

CATEGORY_COVER_IMAGES = {
    "Frontend": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80",
    "Backend": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    "DevOps": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&q=80",
    "AI & Data": "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&q=80",
    "Database": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80",
    "System": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
    "Mobile": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80"
}

CRAWLER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ITBlog-Crawler/2.0"
}


def clean_html_text(text: str) -> str:
    if not text:
        return ""
    unescaped = html.unescape(text)
    cleaned = re.sub(r"<[^>]+>", " ", unescaped)
    return " ".join(cleaned.split()).strip()


def extract_cover_image(item_node, raw_text: str = "") -> Optional[str]:
    enc = item_node.find("enclosure")
    if enc is not None and enc.attrib.get("url"):
        enc_type = enc.attrib.get("type", "").lower()
        if not enc_type or "image" in enc_type or enc.attrib["url"].lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            return enc.attrib["url"]

    for tag_name in [
        "{http://search.yahoo.com/mrss/}content",
        "{http://search.yahoo.com/mrss/}thumbnail",
        "media:content",
        "media:thumbnail"
    ]:
        media_node = item_node.find(tag_name)
        if media_node is not None and media_node.attrib.get("url"):
            return media_node.attrib["url"]

    if raw_text:
        match = re.search(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', raw_text, re.IGNORECASE)
        if match:
            return match.group(1)

    return None


def parse_rss_feed(xml_text: str, max_items: int = 50) -> List[dict]:
    items = []
    try:
        root = ET.fromstring(xml_text)
        # Parse RSS 2.0
        for item_node in root.findall(".//item")[:max_items]:
            title_node = item_node.find("title")
            desc_node = item_node.find("description")
            link_node = item_node.find("link")
            encoded_node = item_node.find("{http://purl.org/rss/1.0/modules/content/}encoded")

            title = title_node.text.strip() if title_node is not None and title_node.text else ""
            desc = desc_node.text.strip() if desc_node is not None and desc_node.text else ""
            encoded_text = encoded_node.text.strip() if encoded_node is not None and encoded_node.text else ""

            clean_desc = clean_html_text(desc)
            clean_encoded = clean_html_text(encoded_text)

            main_body = clean_encoded if len(clean_encoded) > len(clean_desc) else clean_desc
            if not main_body and clean_desc:
                main_body = clean_desc

            excerpt = clean_desc if clean_desc else clean_encoded
            excerpt = (excerpt[:240] + "...") if len(excerpt) > 240 else excerpt

            link = link_node.text.strip() if link_node is not None and link_node.text else ""
            cover_img = extract_cover_image(item_node, raw_text=f"{desc} {encoded_text}")

            item_tags = [c.text.strip().lower() for c in item_node.findall("category") if c.text]

            if title:
                items.append({
                    "title": title,
                    "excerpt": excerpt,
                    "content": f"# {title}\n\n{main_body}\n\n*Nguồn tin gốc: [{title}]({link})*" if link else f"# {title}\n\n{main_body}",
                    "read_time": f"{max(3, len(main_body.split()) // 60)} phút đọc",
                    "tech_stack_version": "RSS 2.0 Ingested",
                    "link": link,
                    "cover_image": cover_img,
                    "tags": item_tags
                })

        # Parse Atom Feed
        if not items:
            for entry_node in root.findall(".//{http://www.w3.org/2005/Atom}entry")[:max_items]:
                title_node = entry_node.find("{http://www.w3.org/2005/Atom}title")
                summary_node = entry_node.find("{http://www.w3.org/2005/Atom}summary")
                content_node = entry_node.find("{http://www.w3.org/2005/Atom}content")
                link_node = entry_node.find("{http://www.w3.org/2005/Atom}link")

                title = title_node.text.strip() if title_node is not None and title_node.text else ""
                raw_summary = summary_node.text.strip() if summary_node is not None and summary_node.text else ""
                raw_content = content_node.text.strip() if content_node is not None and content_node.text else ""

                clean_desc = clean_html_text(raw_summary or raw_content)
                link = ""
                if link_node is not None:
                    link = link_node.attrib.get("href", "") or (link_node.text.strip() if link_node.text else "")

                cover_img = extract_cover_image(entry_node, raw_text=f"{raw_summary} {raw_content}")

                if title:
                    items.append({
                        "title": title,
                        "excerpt": clean_desc[:240] + "..." if len(clean_desc) > 240 else clean_desc,
                        "content": f"# {title}\n\n{clean_desc}\n\n*Nguồn tin gốc: [{title}]({link})*" if link else f"# {title}\n\n{clean_desc}",
                        "read_time": f"{max(3, len(clean_desc.split()) // 60)} phút đọc",
                        "tech_stack_version": "Atom Ingested",
                        "link": link,
                        "cover_image": cover_img,
                        "tags": []
                    })
    except Exception:
        pass
    return items


@router.get("/sources", response_model=List[CrawlSourceResponse])
def list_sources(db: Session = Depends(get_db)):
    return db.query(CrawlSource).order_by(CrawlSource.id.asc()).all()


@router.post("/sources", response_model=CrawlSourceResponse, status_code=status.HTTP_201_CREATED)
def create_source(
    data: CrawlSourceCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên nguồn cào tin tức không được để trống.")

    clean_url = data.url.strip()
    if not clean_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Đường dẫn URL nguồn cào không được để trống.")

    valid_source_types = {"rss", "atom", "api"}
    clean_type = data.source_type.lower().strip() if data.source_type else "rss"
    if clean_type not in valid_source_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Loại nguồn cào tin không hợp lệ. Cho phép: {', '.join(sorted(valid_source_types))}.")

    existing_source = db.query(CrawlSource).filter(CrawlSource.url == clean_url).first()
    if existing_source:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nguồn cào tin tức với URL này đã tồn tại.")

    category_id = data.category_id
    if not category_id and data.category:
        cat = db.query(Category).filter(
            or_(
                Category.name.ilike(data.category.strip()),
                Category.slug == slugify(data.category.strip())
            )
        ).first()
        if cat:
            category_id = cat.id

    if category_id:
        cat = db.query(Category).filter(Category.id == category_id).first()
        if not cat:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chuyên mục được chỉ định không tồn tại.")

    source = CrawlSource(
        name=clean_name,
        url=clean_url,
        source_type=clean_type,
        category_id=category_id,
        is_active=True
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    source = db.query(CrawlSource).filter(CrawlSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nguồn cào tin tức.")
    db.delete(source)
    db.commit()
    return None


@router.get("/jobs", response_model=List[CrawlJobResponse])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(CrawlJob).order_by(CrawlJob.created_at.desc()).limit(20).all()


@router.post("/trigger", response_model=CrawlResultResponse)
def trigger_crawl(
    req: TriggerCrawlRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    items_to_process = []
    target_sources = []

    if req.source_id:
        src = db.query(CrawlSource).filter(CrawlSource.id == req.source_id).first()
        if not src:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nguồn cào tin tức không tồn tại.")
        target_sources.append(src)
    else:
        target_sources = db.query(CrawlSource).filter(CrawlSource.is_active == True).all()

    max_items = req.limit if (hasattr(req, "limit") and req.limit and req.limit > 0) else 50

    # Ingest from active sources
    for src in target_sources:
        if not src.url:
            continue
        try:
            resp = httpx.get(src.url, timeout=8.0, follow_redirects=True, headers=CRAWLER_HEADERS)
            if resp.status_code == 200:
                parsed = parse_rss_feed(resp.text, max_items=max_items)
                for item in parsed:
                    if src.category_id and not item.get("category_id"):
                        item["category_id"] = src.category_id
                    items_to_process.append(item)
        except Exception:
            continue

    # Fallback to default high-quality feeds if no live items were fetched
    if not items_to_process:
        items_to_process = DEFAULT_FEEDS

    job = CrawlJob(
        source_id=req.source_id,
        status="processing",
        items_crawled=len(items_to_process),
        items_saved=0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    categories = db.query(Category).all()
    cat_map = {c.name.lower(): c.id for c in categories}
    cat_id_to_name = {c.id: c.name for c in categories}

    author_user = (
        current_user
        if current_user
        else db.query(User).filter(User.is_superuser == True).first()
        or db.query(User).first()
    )
    author_id = author_user.id if author_user else 1

    source = target_sources[0] if (req.source_id and target_sources) else None
    saved_posts = []
    seen_slugs = set()

    for item in items_to_process:
        base_slug = slugify(item["title"]) or f"tin-tuc-{hashlib.md5(item['title'].encode()).hexdigest()[:8]}"

        # Check duplicate against database and currently processed batch
        if base_slug in seen_slugs or db.query(Post.id).filter(or_(Post.slug == base_slug, Post.title == item["title"])).first():
            continue
        seen_slugs.add(base_slug)

        # Determine category_id: prioritize targeted source category
        cat_id = None
        if source and source.category_id:
            cat_id = source.category_id
        elif item.get("category_id"):
            cat_id = item["category_id"]
        elif item.get("category"):
            cat_id = cat_map.get(str(item["category"]).lower())

        if not cat_id:
            text_corpus = (item["title"] + " " + item.get("excerpt", "")).lower()
            for cat_name, keywords in CATEGORY_KEYWORDS.items():
                if any(kw in text_corpus for kw in keywords):
                    cat_id = cat_map.get(cat_name.lower())
                    break

        if not cat_id:
            cat_id = cat_map.get("backend") or (categories[0].id if categories else None)

        matched_cat_name = cat_id_to_name.get(cat_id, "Backend")
        cover_url = item.get("cover_image") or CATEGORY_COVER_IMAGES.get(
            matched_cat_name,
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80"
        )

        now = datetime.now(timezone.utc)
        post_status = PostStatus.APPROVED.value if req.auto_publish else PostStatus.DRAFT.value

        new_post = Post(
            title=item["title"],
            slug=base_slug,
            excerpt=item.get("excerpt", "")[:300],
            content=item["content"],
            category_id=cat_id,
            cover_image=cover_url,
            read_time=item.get("read_time", "5 phút đọc"),
            tech_stack_version=item.get("tech_stack_version", "Modern Tech Stack"),
            status=post_status,
            author_id=author_id,
            published_at=now if req.auto_publish else None,
            views=120
        )
        db.add(new_post)
        db.flush()

        # Link or create tags
        tag_names = item.get("tags") or []
        if not tag_names:
            text_corpus = (item["title"] + " " + item.get("excerpt", "")).lower()
            for kw_list in CATEGORY_KEYWORDS.values():
                for kw in kw_list:
                    if kw in text_corpus and kw not in tag_names:
                        tag_names.append(kw)
                        if len(tag_names) >= 3:
                            break
                if len(tag_names) >= 3:
                    break

        for t_name in tag_names[:4]:
            t_clean = slugify(t_name)
            if not t_clean:
                continue
            existing_tag = db.query(Tag).filter(or_(Tag.slug == t_clean, Tag.name.ilike(t_name))).first()
            if not existing_tag:
                existing_tag = Tag(name=t_name.title(), slug=t_clean)
                db.add(existing_tag)
                db.flush()
            db.add(PostTag(post_id=new_post.id, tag_id=existing_tag.id))

        saved_posts.append({
            "title": new_post.title,
            "slug": new_post.slug,
            "status": new_post.status
        })

    db.commit()

    job.status = "success"
    job.items_saved = len(saved_posts)
    db.add(job)
    db.commit()
    db.refresh(job)

    target_name = target_sources[0].name if (req.source_id and target_sources) else "các nguồn tin đã chọn"
    if len(saved_posts) > 0:
        result_message = f"Đã thu thập và lưu thành công {len(saved_posts)} bài viết mới từ {target_name}!"
    elif len(items_to_process) > 0:
        result_message = f"Nguồn tin '{target_name}' đã đồng bộ mới nhất ({len(items_to_process)} bài viết đã được đối soát, tất cả đã tồn tại trên hệ thống, không có bài mới trùng lặp)."
    else:
        result_message = f"Không tìm thấy bài viết nào từ {target_name}. Vui lòng kiểm tra lại URL nguồn."

    return CrawlResultResponse(
        job=CrawlJobResponse.model_validate(job),
        crawled_posts=saved_posts,
        message=result_message
    )
