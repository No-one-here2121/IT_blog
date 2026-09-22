from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from app.core.database import get_db
from app.models.post import Post, PostStatus, PostTag
from app.models.interaction import Follow, PostLike, Bookmark
from app.models.comment import Comment
from app.models.user import User
from app.schemas.post import PostListItem, PaginatedPostResponse
from app.api.deps import get_current_active_user, get_current_user_optional

router = APIRouter(tags=["Feeds"])


@router.get("/feeds/following", response_model=PaginatedPostResponse)
def get_following_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Feed Following: Bài viết được đăng bởi những tác giả người dùng đang theo dõi.
    """
    following_ids = [
        f.following_id
        for f in db.query(Follow.following_id).filter(Follow.follower_id == current_user.id).all()
    ]

    if not following_ids:
        return PaginatedPostResponse(items=[], total=0, page=page, limit=limit, total_pages=1)

    now = datetime.now(timezone.utc)
    query = (
        db.query(Post)
        .filter(
            Post.status == PostStatus.APPROVED.value,
            Post.author_id.in_(following_ids),
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .order_by(desc(Post.created_at))
    )

    total = query.count()
    offset = (page - 1) * limit
    posts = query.offset(offset).limit(limit).all()

    items = [PostListItem.model_validate(p) for p in posts]
    total_pages = max(1, (total + limit - 1) // limit)

    return PaginatedPostResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/feeds/trending", response_model=List[PostListItem])
def get_trending_posts(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Feed Trending: Bài viết nổi bật nhất tính theo lượt xem và số lượt thích gần đây.
    """
    now = datetime.now(timezone.utc)
    posts = (
        db.query(Post)
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .order_by(desc(Post.views), desc(Post.created_at))
        .limit(limit)
        .all()
    )
    return [PostListItem.model_validate(p) for p in posts]


@router.get("/feeds/for-you", response_model=PaginatedPostResponse)
def get_for_you_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Feed For You: Gợi ý bài viết cá nhân hóa dựa trên Category/Tag người dùng đã like/bookmark.
    Fallback về bài mới nhất/trending nếu chưa có dữ liệu hành vi.
    """
    now = datetime.now(timezone.utc)
    query = db.query(Post).filter(
        Post.status == PostStatus.APPROVED.value,
        or_(Post.scheduled_at == None, Post.scheduled_at <= now)
    )

    if current_user:
        # Get category IDs from liked posts and bookmarks
        liked_cat_ids = [
            p.category_id for p in
            db.query(Post.category_id)
            .join(PostLike, PostLike.post_id == Post.id)
            .filter(PostLike.user_id == current_user.id, Post.category_id != None)
            .all()
        ]
        bookmarked_cat_ids = [
            p.category_id for p in
            db.query(Post.category_id)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .filter(Bookmark.user_id == current_user.id, Post.category_id != None)
            .all()
        ]
        preferred_cats = list(set(liked_cat_ids + bookmarked_cat_ids))

        if preferred_cats:
            query = query.filter(Post.category_id.in_(preferred_cats))

    total = query.count()
    offset = (page - 1) * limit
    posts = query.order_by(desc(Post.created_at)).offset(offset).limit(limit).all()

    # Fallback to general latest posts only if personalized feed has no posts at all
    if total == 0:
        fallback_query = (
            db.query(Post)
            .filter(
                Post.status == PostStatus.APPROVED.value,
                or_(Post.scheduled_at == None, Post.scheduled_at <= now)
            )
            .order_by(desc(Post.created_at))
        )
        total = fallback_query.count()
        posts = fallback_query.offset(offset).limit(limit).all()

    items = [PostListItem.model_validate(p) for p in posts]
    total_pages = max(1, (total + limit - 1) // limit)

    return PaginatedPostResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/posts/{post_id}/related", response_model=List[PostListItem])
@router.get("/feeds/posts/{post_id}/related", response_model=List[PostListItem])
def get_related_posts(
    post_id: int,
    limit: int = Query(4, ge=1, le=10),
    db: Session = Depends(get_db)
):
    """
    Related Posts: Gợi ý các bài viết cùng danh mục hoặc cùng tag (loại trừ bài hiện tại).
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    now = datetime.now(timezone.utc)
    sched = post.scheduled_at
    if sched and sched.tzinfo is None:
        sched = sched.replace(tzinfo=timezone.utc)

    if post.status != PostStatus.APPROVED.value or (sched and sched > now):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    related = (
        db.query(Post)
        .filter(
            Post.id != post_id,
            Post.status == PostStatus.APPROVED.value,
            Post.category_id == post.category_id,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .order_by(desc(Post.views))
        .limit(limit)
        .all()
    )

    # If not enough in same category, supplement with latest posts
    if len(related) < limit:
        excluded_ids = [p.id for p in related] + [post_id]
        more = (
            db.query(Post)
            .filter(
                Post.status == PostStatus.APPROVED.value,
                ~Post.id.in_(excluded_ids),
                or_(Post.scheduled_at == None, Post.scheduled_at <= now)
            )
            .order_by(desc(Post.created_at))
            .limit(limit - len(related))
            .all()
        )
        related.extend(more)

    return [PostListItem.model_validate(p) for p in related]
