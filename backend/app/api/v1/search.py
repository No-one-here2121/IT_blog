from typing import Optional
from datetime import datetime, timezone
import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.models.post import Post, PostStatus
from app.models.category import Category
from app.models.tag import Tag
from app.models.user import User
from app.schemas.post import PostListItem, PaginatedPostResponse

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=PaginatedPostResponse)
def search_posts(
    q: Optional[str] = Query(None, description="Search query string"),
    author: Optional[str] = Query(None, description="Author username or name"),
    category: Optional[str] = Query(None, description="Category slug or name"),
    tag: Optional[str] = Query(None, description="Tag slug or name"),
    sort_by: str = Query("newest", description="Sort: newest, views"),
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Search posts with full-text keyword matching, multi-parameter filtering, and pagination.
    """
    now = datetime.now(timezone.utc)
    query = db.query(Post).filter(
        Post.status == PostStatus.APPROVED.value,
        or_(Post.scheduled_at == None, Post.scheduled_at <= now)
    )

    # Keyword search across title, excerpt, and markdown content
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Post.title.ilike(term),
                Post.excerpt.ilike(term),
                Post.content.ilike(term)
            )
        )

    # Author filter
    if author and author.strip():
        author_term = f"%{author.strip()}%"
        query = query.join(Post.author).filter(
            or_(
                User.username.ilike(author_term),
                User.name.ilike(author_term)
            )
        )

    # Category filter
    if category and category != "Tất cả":
        query = query.join(Post.category).filter(
            or_(Category.slug == category, Category.name.ilike(category))
        )

    # Tag filter
    if tag:
        query = query.join(Post.tags).filter(
            or_(Tag.slug == tag, Tag.name.ilike(tag))
        ).distinct()

    # Sorting
    if sort_by in ["views", "popular", "trending"]:
        query = query.order_by(desc(Post.views), desc(Post.created_at))
    elif sort_by == "oldest":
        query = query.order_by(Post.created_at.asc())
    else:  # newest
        query = query.order_by(desc(Post.created_at))

    total = query.count()
    offset = (page - 1) * limit
    posts = query.offset(offset).limit(limit).all()

    items = [PostListItem.model_validate(p) for p in posts]
    total_pages = max(1, math.ceil(total / limit))

    return PaginatedPostResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )
