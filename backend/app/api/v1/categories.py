from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from slugify import slugify
from app.core.database import get_db
from app.models.category import Category
from app.models.post import Post, PostStatus
from app.schemas.category import CategoryCreate, CategoryResponse
from app.api.deps import require_role

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """
    Get all categories with count of published posts.
    """
    # Subquery for approved post count (excluding future scheduled posts)
    now = datetime.now(timezone.utc)
    post_counts = (
        db.query(Post.category_id, func.count(Post.id).label("count"))
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .group_by(Post.category_id)
        .all()
    )
    count_dict = {cat_id: c for cat_id, c in post_counts if cat_id is not None}

    categories = db.query(Category).order_by(Category.name.asc()).all()
    results = []
    for cat in categories:
        resp = CategoryResponse.model_validate(cat)
        resp.post_count = count_dict.get(cat.id, 0)
        results.append(resp)

    return results


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin", "moderator"))
):
    """
    Create a new category (Requires admin or moderator role).
    """
    clean_name = cat_in.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên danh mục không được để trống."
        )

    slug = slugify(cat_in.slug.strip()) if cat_in.slug and cat_in.slug.strip() else slugify(clean_name)
    existing = db.query(Category).filter(
        (func.lower(Category.name) == clean_name.lower()) | (Category.slug == slug)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh mục này hoặc slug đã tồn tại."
        )

    new_cat = Category(
        name=clean_name,
        slug=slug,
        description=cat_in.description,
        icon=cat_in.icon
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return CategoryResponse.model_validate(new_cat)
