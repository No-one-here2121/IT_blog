import hashlib
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from slugify import slugify

from app.core.database import get_db
from app.models.user import User
from app.models.post import Post, PostStatus
from app.models.category import Category
from app.models.crawler import CrawlSource, CrawlJob
from app.schemas.crawler import (
    CrawlSourceCreate,
    CrawlSourceResponse,
    TriggerCrawlRequest,
    CrawlJobResponse,
    CrawlResultResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/crawler", tags=["Crawler & News Ingestion"])


def parse_rss_feed(xml_text: str) -> List[dict]:
    """Parse RSS 2.0 or Atom XML feed into standard post dictionary."""
    items = []
    try:
        root = ET.fromstring(xml_text)
        # 1. Check standard RSS 2.0 <channel><item>
        for item_node in root.findall(".//item")[:10]:
            title_node = item_node.find("title")
            desc_node = item_node.find("description")
            link_node = item_node.find("link")
            title = title_node.text.strip() if title_node is not None and title_node.text else ""
            desc = desc_node.text.strip() if desc_node is not None and desc_node.text else ""
            clean_desc = re.sub(r'<[^>]+>', '', desc).strip()
            link = link_node.text.strip() if link_node is not None and link_node.text else ""
            if title:
                items.append({
                    "title": title,
                    "excerpt": clean_desc[:220] + "..." if len(clean_desc) > 220 else clean_desc,
                    "content": f"# {title}\n\n{clean_desc}\n\n*Nguồn tin gốc: [{title}]({link})*",
                    "read_time": "5 phút đọc",
                    "tech_stack_version": "RSS 2.0 Ingested"
                })

        # 2. Check Atom <entry>
        if not items:
            for entry_node in root.findall(".//{http://www.w3.org/2005/Atom}entry")[:10]:
                title_node = entry_node.find("{http://www.w3.org/2005/Atom}title")
                summary_node = entry_node.find("{http://www.w3.org/2005/Atom}summary")
                content_node = entry_node.find("{http://www.w3.org/2005/Atom}content")
                title = title_node.text.strip() if title_node is not None and title_node.text else ""
                desc = (summary_node.text if summary_node is not None else (content_node.text if content_node is not None else "")) or ""
                clean_desc = re.sub(r'<[^>]+>', '', desc).strip()
                if title:
                    items.append({
                        "title": title,
                        "excerpt": clean_desc[:220] + "..." if len(clean_desc) > 220 else clean_desc,
                        "content": f"# {title}\n\n{clean_desc}",
                        "read_time": "5 phút đọc",
                        "tech_stack_version": "Atom Ingested"
                    })
    except Exception:
        pass
    return items



DEFAULT_FEEDS = [
    {
        "title": "Xây dựng Event-Driven Architecture với Apache Kafka và Python",
        "excerpt": "Phân tích mô hình kiến trúc hướng sự kiện, xử lý luồng dữ liệu thời gian thực quy mô lớn.",
        "content": "# Event-Driven Architecture với Kafka\n\nKiến trúc hướng sự kiện giúp phân tách các dịch vụ microservices...",
        "read_time": "6 phút đọc",
        "tech_stack_version": "Kafka 3.6 / Python 3.11"
    },
    {
        "title": "Tối ưu hóa Truy vấn PostgreSQL nâng cao với Index BRIN và EXPLAIN ANALYZE",
        "excerpt": "Chiến lược lập chỉ mục dữ liệu chuỗi thời gian lớn và phân tích chi phí kế hoạch thực thi câu lệnh SQL.",
        "content": "# Tối ưu PostgreSQL với BRIN Index\n\nĐối với các bảng có hàng trăm triệu dòng ghi theo thứ tự thời gian...",
        "read_time": "8 phút đọc",
        "tech_stack_version": "PostgreSQL 16"
    },
    {
        "title": "Triển khai Kubernetes Zero-Downtime Deployment cho FastAPI",
        "excerpt": "Cấu hình Rolling Update, Liveness Probe, Readiness Probe và Horizontal Pod Autoscaler.",
        "content": "# Zero-Downtime Deployment trên K8s\n\nĐảm bảo hệ thống hoạt động liên tục 99.99% khi cập nhật phiên bản mới...",
        "read_time": "7 phút đọc",
        "tech_stack_version": "Kubernetes 1.29 / FastAPI 0.110"
    }
]


@router.get("/sources", response_model=List[CrawlSourceResponse])
def list_sources(db: Session = Depends(get_db)):
    """
    Get all registered technology crawl sources.
    """
    return db.query(CrawlSource).order_by(CrawlSource.id.asc()).all()


@router.post("/sources", response_model=CrawlSourceResponse, status_code=status.HTTP_201_CREATED)
def create_source(
    data: CrawlSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a new RSS / API tech crawl source.
    """
    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên nguồn cào tin tức không được để trống."
        )

    clean_url = data.url.strip()
    if not clean_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đường dẫn URL nguồn cào không được để trống."
        )

    valid_source_types = {"rss", "atom", "api"}
    clean_type = data.source_type.lower().strip() if data.source_type else "rss"
    if clean_type not in valid_source_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loại nguồn cào tin không hợp lệ. Cho phép: {', '.join(sorted(valid_source_types))}."
        )

    existing_source = db.query(CrawlSource).filter(CrawlSource.url == clean_url).first()
    if existing_source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nguồn cào tin tức với URL này đã tồn tại."
        )

    if data.category_id:
        cat = db.query(Category).filter(Category.id == data.category_id).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chuyên mục được chỉ định không tồn tại."
            )

    source = CrawlSource(
        name=clean_name,
        url=clean_url,
        source_type=clean_type,
        category_id=data.category_id,
        is_active=True
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.get("/jobs", response_model=List[CrawlJobResponse])
def list_jobs(db: Session = Depends(get_db)):
    """
    Get history of crawl jobs with statuses.
    """
    return db.query(CrawlJob).order_by(CrawlJob.created_at.desc()).limit(20).all()


@router.post("/trigger", response_model=CrawlResultResponse)
def trigger_crawl(
    req: TriggerCrawlRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Trigger technology content crawl job. Performs duplicate detection via title/slug hash.
    """
    items_to_process = DEFAULT_FEEDS
    source = None
    if req.source_id:
        source = db.query(CrawlSource).filter(CrawlSource.id == req.source_id).first()
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nguồn cào tin tức không tồn tại."
            )
        if source.url:
            try:
                resp = httpx.get(source.url, timeout=3.0, follow_redirects=True)
                if resp.status_code == 200:
                    live_items = parse_rss_feed(resp.text)
                    if live_items:
                        items_to_process = live_items
            except Exception:
                pass

    job = CrawlJob(
        source_id=req.source_id,
        status="processing",
        items_crawled=len(items_to_process),
        items_saved=0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    saved_posts = []
    seen_slugs = set()
    for item in items_to_process:
        base_slug = slugify(item["title"]) or "tin-tuc"
        
        # Check duplicate against database and currently processed batch
        if base_slug in seen_slugs or db.query(Post).filter(Post.slug == base_slug).first():
            continue
        seen_slugs.add(base_slug)

        new_post = Post(
            title=item["title"],
            slug=base_slug,
            excerpt=item["excerpt"],
            content=item["content"],
            category_id=source.category_id if source else None,
            read_time=item["read_time"],
            tech_stack_version=item.get("tech_stack_version"),
            status=PostStatus.APPROVED.value if req.auto_publish else PostStatus.DRAFT.value,
            author_id=current_user.id,
            published_at=datetime.now(timezone.utc) if req.auto_publish else None
        )
        db.add(new_post)
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

    return CrawlResultResponse(
        job=CrawlJobResponse.model_validate(job),
        crawled_posts=saved_posts
    )
