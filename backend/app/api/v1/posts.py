from datetime import datetime, timezone
from typing import Optional, List
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from slugify import slugify

from app.core.database import get_db
from app.models.post import Post, PostTag, PostStatus, PostRevision
from app.models.category import Category
from app.models.tag import Tag
from app.models.user import User
from app.models.gamification import ReputationLog
from app.models.comment import Comment, CommentLike
from app.models.quiz import QuizQuestionPost
from app.models.interaction import PostLike, Bookmark
from app.models.behavior import UserBehaviorEvent
from app.models.notification import Notification
from app.models.roadmap import RoadmapStep
from app.models.moderation import Report
from app.services.gemini_service import gemini_service
from app.schemas.post import (
    PostCreate,
    PostUpdate,
    PostVerifyRequest,
    PostResponse,
    PostListItem,
    PaginatedPostResponse,
    RelatedVideo,
    PostRevisionResponse,
    PostShareResponse
)

from app.api.deps import (
    get_current_user,
    get_current_user_optional,
    get_current_active_user
)

router = APIRouter(prefix="/posts", tags=["Posts"])


def generate_unique_slug(db: Session, title: str, current_post_id: Optional[int] = None) -> str:
    """Generate a URL-safe, unique slug from post title with collision fallback."""
    base_slug = slugify(title)
    if not base_slug:
        base_slug = "bai-viet"
    
    slug = base_slug
    counter = 1
    while True:
        query = db.query(Post).filter(Post.slug == slug)
        if current_post_id:
            query = query.filter(Post.id != current_post_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def calculate_read_time(content: str) -> str:
    """Calculate approximate read time based on word count (avg 200 words/min)."""
    words = len(content.split())
    minutes = max(1, math.ceil(words / 200))
    return f"{minutes} phút đọc"


@router.get("", response_model=PaginatedPostResponse)
def get_posts(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(9, ge=1, le=500, description="Items per page"),
    category: Optional[str] = Query(None, description="Category name or slug"),
    tag: Optional[str] = Query(None, description="Tag name or slug"),
    author_id: Optional[int] = Query(None, description="Filter by author ID"),
    status_filter: Optional[str] = Query(PostStatus.APPROVED.value, description="Post status"),
    search: Optional[str] = Query(None, description="Keyword search in title or content"),
    sort_by: Optional[str] = Query("newest", description="Sort by: newest, views"),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get paginated posts with filters, search, and sorting.
    """
    query = db.query(Post)

    # Status filter - Only author or admin/moderator can query non-approved posts
    clean_status = (status_filter or PostStatus.APPROVED.value).strip().lower()
    is_privileged = current_user and (
        current_user.is_superuser or
        any(r.name in ["admin", "moderator"] for r in current_user.roles) or
        (author_id is not None and author_id == current_user.id)
    )
    if not is_privileged:
        clean_status = PostStatus.APPROVED.value

    if clean_status and clean_status != "all":
        query = query.filter(Post.status == clean_status)
        if clean_status == PostStatus.APPROVED.value:
            query = query.filter(
                or_(Post.scheduled_at == None, Post.scheduled_at <= datetime.now(timezone.utc))
            )
    elif not clean_status:
        query = query.filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= datetime.now(timezone.utc))
        )

    # Author filter
    if author_id:
        query = query.filter(Post.author_id == author_id)

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

    # Search keyword
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Post.title.ilike(term),
                Post.excerpt.ilike(term),
                Post.content.ilike(term)
            )
        )

    # Sorting
    if sort_by in ["views", "popular", "trending"]:
        query = query.order_by(desc(Post.views), desc(Post.created_at))
    elif sort_by == "oldest":
        query = query.order_by(Post.created_at.asc())
    else:  # newest
        query = query.order_by(desc(Post.created_at))

    total = query.count()
    total_pages = max(1, math.ceil(total / limit))
    offset = (page - 1) * limit

    posts = query.offset(offset).limit(limit).all()

    items = [PostListItem.model_validate(p) for p in posts]

    return PaginatedPostResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{identifier}", response_model=PostResponse)
def get_post_detail(
    identifier: str,
    track_view: bool = Query(True, description="Ghi nhận tăng lượt xem thật cho bài viết"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get full post detail by ID or Slug. Automatically increments view count for published posts.
    """
    if identifier.isdigit():
        post = db.query(Post).filter(Post.id == int(identifier)).first()
    else:
        post = db.query(Post).filter(Post.slug == identifier).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết này."
        )

    now = datetime.now(timezone.utc)
    is_author_or_admin = current_user and (
        current_user.id == post.author_id or
        current_user.is_superuser or
        any(r.name in ["admin", "moderator"] for r in current_user.roles)
    )

    sched = post.scheduled_at
    if sched and sched.tzinfo is None:
        sched = sched.replace(tzinfo=timezone.utc)

    is_published = (
        post.status == PostStatus.APPROVED.value and
        (sched is None or sched <= now)
    )

    if not is_published and not is_author_or_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết này."
        )

    # Increment view count only for published posts when track_view is True
    if is_published and track_view:
        post.views += 1
        db.add(post)
        db.commit()
        db.refresh(post)

    return PostResponse.model_validate(post)


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    post_in: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new post. Category and Tags are linked or created if missing.
    """
    clean_title = post_in.title.strip()
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiêu đề bài viết không được để trống."
        )

    clean_content = post_in.content.strip()
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nội dung bài viết không được để trống."
        )

    slug = generate_unique_slug(db, clean_title)
    read_time = calculate_read_time(clean_content)
    excerpt = post_in.excerpt.strip() if post_in.excerpt else clean_title

    # Resolve category
    category_id = post_in.category_id
    if category_id:
        existing_cat = db.query(Category).filter(Category.id == category_id).first()
        if not existing_cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chuyên mục được chỉ định không tồn tại."
            )
    elif post_in.category_name and post_in.category_name.strip():
        cat_clean = post_in.category_name.strip()
        cat_slug = slugify(cat_clean) or "category"
        cat = db.query(Category).filter(
            or_(
                Category.name.ilike(cat_clean),
                Category.slug == cat_slug
            )
        ).first()
        if not cat:
            cat = Category(name=cat_clean, slug=cat_slug, icon="📁")
            db.add(cat)
            db.flush()
        category_id = cat.id

    valid_statuses = {s.value for s in PostStatus}
    if post_in.status:
        clean_status = post_in.status.lower()
        if clean_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trạng thái bài viết không hợp lệ."
            )
        post_status = clean_status
    else:
        post_status = PostStatus.APPROVED.value

    new_post = Post(
        title=post_in.title.strip(),
        slug=slug,
        excerpt=excerpt,
        content=post_in.content.strip(),
        cover_image=post_in.cover_image,
        status=post_status,
        read_time=read_time,
        author_id=current_user.id,
        category_id=category_id,
        tech_stack_version=post_in.tech_stack_version,
        scheduled_at=post_in.scheduled_at,
        published_at=datetime.now(timezone.utc) if post_status == PostStatus.APPROVED.value else None
    )
    db.add(new_post)


    # Process and link tags (deduplicated by slug)
    if post_in.tags:
        seen_tag_slugs = set()
        for tag_name in post_in.tags:
            clean_name = tag_name.strip().lstrip("#")
            if not clean_name:
                continue
            tag_slug = slugify(clean_name)
            if not tag_slug or tag_slug in seen_tag_slugs:
                continue
            seen_tag_slugs.add(tag_slug)
            tag_obj = db.query(Tag).filter(
                or_(Tag.slug == tag_slug, Tag.name.ilike(clean_name))
            ).first()
            if not tag_obj:
                tag_obj = Tag(name=clean_name, slug=tag_slug)
                db.add(tag_obj)
                db.flush()
            if tag_obj not in new_post.tags:
                new_post.tags.append(tag_obj)

    db.commit()
    db.refresh(new_post)

    return PostResponse.model_validate(new_post)


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    post_in: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update post details. Only author, moderator or admin can edit.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết để chỉnh sửa."
        )

    # Check permission
    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if post.author_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chỉnh sửa bài viết của người khác."
        )

    # Save revision snapshot of previous content before updating if title or content changed
    title_changed = post_in.title is not None and post_in.title.strip() != post.title
    content_changed = post_in.content is not None and post_in.content.strip() != post.content
    if title_changed or content_changed:
        revision = PostRevision(
            post_id=post.id,
            title=post.title,
            excerpt=post.excerpt,
            content=post.content,
            change_summary=post_in.change_summary or "Chỉnh sửa bài viết",
            edited_by_id=current_user.id
        )
        db.add(revision)

    if post_in.title is not None:
        if not post_in.title.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tiêu đề bài viết không được để trống."
            )
        if post_in.title.strip() != post.title:
            post.title = post_in.title.strip()
            post.slug = generate_unique_slug(db, post.title, current_post_id=post.id)

    if post_in.content is not None:
        if not post_in.content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nội dung bài viết không được để trống."
            )
        post.content = post_in.content.strip()
        post.read_time = calculate_read_time(post.content)

    if post_in.excerpt is not None:
        post.excerpt = post_in.excerpt.strip()

    if post_in.cover_image is not None:
        post.cover_image = post_in.cover_image

    if post_in.status is not None:
        new_status = post_in.status.lower()
        valid_statuses = {s.value for s in PostStatus}
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trạng thái bài viết không hợp lệ."
            )
        post.status = new_status
        if new_status == PostStatus.APPROVED.value and not post.published_at:
            post.published_at = datetime.now(timezone.utc)

    if post_in.category_id is not None:
        if post_in.category_id > 0:
            existing_cat = db.query(Category).filter(Category.id == post_in.category_id).first()
            if not existing_cat:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Chuyên mục được chỉ định không tồn tại."
                )
            post.category_id = post_in.category_id
        else:
            post.category_id = None
    elif post_in.category_name is not None and post_in.category_name.strip():
        cat_clean = post_in.category_name.strip()
        cat_slug = slugify(cat_clean) or "category"
        cat = db.query(Category).filter(
            or_(
                Category.name.ilike(cat_clean),
                Category.slug == cat_slug
            )
        ).first()
        if not cat:
            cat = Category(name=cat_clean, slug=cat_slug, icon="📁")
            db.add(cat)
            db.flush()
        post.category_id = cat.id

    if post_in.tech_stack_version is not None:
        post.tech_stack_version = post_in.tech_stack_version

    if post_in.is_deprecated is not None:
        post.is_deprecated = post_in.is_deprecated

    if post_in.deprecated_warning is not None:
        post.deprecated_warning = post_in.deprecated_warning

    if post_in.scheduled_at is not None:
        post.scheduled_at = post_in.scheduled_at

    if post_in.tags is not None:
        post.tags.clear()
        seen_tag_slugs = set()
        for tag_name in post_in.tags:
            clean_name = tag_name.strip().lstrip("#")
            if not clean_name:
                continue
            tag_slug = slugify(clean_name)
            if not tag_slug or tag_slug in seen_tag_slugs:
                continue
            seen_tag_slugs.add(tag_slug)
            tag_obj = db.query(Tag).filter(
                or_(Tag.slug == tag_slug, Tag.name.ilike(clean_name))
            ).first()
            if not tag_obj:
                tag_obj = Tag(name=clean_name, slug=tag_slug)
                db.add(tag_obj)
                db.flush()
            if tag_obj not in post.tags:
                post.tags.append(tag_obj)

    db.add(post)
    db.commit()
    db.refresh(post)

    return PostResponse.model_validate(post)


@router.get("/{post_id}/revisions", response_model=List[PostRevisionResponse])
def get_post_revisions(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get edit revision history for a post (Section 3).
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    now = datetime.now(timezone.utc)
    is_author_or_admin = current_user and (
        current_user.id == post.author_id or
        current_user.is_superuser or
        any(r.name in ["admin", "moderator"] for r in current_user.roles)
    )

    sched = post.scheduled_at
    if sched and sched.tzinfo is None:
        sched = sched.replace(tzinfo=timezone.utc)

    is_published = (
        post.status == PostStatus.APPROVED.value and
        (sched is None or sched <= now)
    )

    if not is_published and not is_author_or_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    return db.query(PostRevision).filter(PostRevision.post_id == post_id).order_by(desc(PostRevision.created_at)).all()


@router.post("/{post_id}/share", response_model=PostShareResponse)
def share_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Record post share event, increment share counter and return share URL (Section 4).
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

    is_published = (
        post.status == PostStatus.APPROVED.value and
        (sched is None or sched <= now)
    )

    if not is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết để chia sẻ."
        )

    post.shares_count = (post.shares_count or 0) + 1

    # Record behavior event if user is authenticated
    if current_user:
        event = UserBehaviorEvent(
            user_id=current_user.id,
            event_type="share",
            post_id=post_id,
            category_id=post.category_id
        )
        db.add(event)

    db.commit()
    db.refresh(post)

    return PostShareResponse(
        post_id=post.id,
        shares_count=post.shares_count,
        share_url=f"/posts/{post.slug}",
        message="Ghi nhận lượt chia sẻ thành công."
    )



@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete post. Only author, moderator or admin can delete.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết để xóa."
        )

    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if post.author_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa bài viết của người khác."
        )

    # Clean up associated records to ensure referential integrity
    comment_ids = [c[0] for c in db.query(Comment.id).filter(Comment.post_id == post_id).all()]
    if comment_ids:
        db.query(CommentLike).filter(CommentLike.comment_id.in_(comment_ids)).delete(synchronize_session=False)
        db.query(ReputationLog).filter(
            ReputationLog.reference_id.in_(comment_ids),
            ReputationLog.action == "accepted_answer"
        ).delete(synchronize_session=False)
        db.query(Report).filter(
            Report.target_type == "comment",
            Report.target_id.in_(comment_ids)
        ).delete(synchronize_session=False)
        db.query(Notification).filter(
            Notification.entity_type == "comment",
            Notification.entity_id.in_(comment_ids)
        ).delete(synchronize_session=False)
        # Nullify parent_id to prevent self-referencing foreign key violations
        db.query(Comment).filter(Comment.post_id == post_id).update({"parent_id": None}, synchronize_session=False)
        db.query(Comment).filter(Comment.post_id == post_id).delete(synchronize_session=False)

    db.query(RoadmapStep).filter(RoadmapStep.post_id == post_id).update({"post_id": None}, synchronize_session=False)
    db.query(QuizQuestionPost).filter(QuizQuestionPost.post_id == post_id).delete(synchronize_session=False)
    db.query(PostLike).filter(PostLike.post_id == post_id).delete(synchronize_session=False)
    db.query(Bookmark).filter(Bookmark.post_id == post_id).delete(synchronize_session=False)
    db.query(UserBehaviorEvent).filter(UserBehaviorEvent.post_id == post_id).delete(synchronize_session=False)
    db.query(PostRevision).filter(PostRevision.post_id == post_id).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.entity_type == "post", Notification.entity_id == post_id).delete(synchronize_session=False)
    db.query(Report).filter(
        Report.target_type == "post",
        Report.target_id == post_id
    ).delete(synchronize_session=False)
    db.query(ReputationLog).filter(
        ReputationLog.reference_id == post_id,
        ReputationLog.action.in_(["verified_post", "create_post"])
    ).delete(synchronize_session=False)

    db.delete(post)
    db.commit()
    return None


@router.post("/{post_id}/verify", response_model=PostResponse)
def verify_post(
    post_id: int,
    verify_in: Optional[PostVerifyRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Verification Center: Expert or moderator reviews and verifies technical accuracy of post.
    """
    if verify_in is None:
        verify_in = PostVerifyRequest()
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết để xác thực."
        )

    is_reviewer = current_user.is_superuser or any(r.name in ["admin", "moderator", "reviewer"] for r in current_user.roles)
    if not is_reviewer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ kiểm duyệt viên hoặc chuyên gia kỹ thuật mới có quyền xác thực bài viết."
        )

    post.is_verified = verify_in.is_verified
    post.verification_notes = verify_in.verification_notes
    post.verified_by_id = current_user.id if verify_in.is_verified else None
    post.verified_at = datetime.now(timezone.utc) if verify_in.is_verified else None
    if verify_in.tech_stack_version is not None:
        post.tech_stack_version = verify_in.tech_stack_version
    post.is_deprecated = verify_in.is_deprecated
    post.deprecated_warning = verify_in.deprecated_warning

    # Award reputation log if verified and not already awarded
    if verify_in.is_verified and post.author_id:
        already_awarded = db.query(ReputationLog).filter(
            ReputationLog.user_id == post.author_id,
            ReputationLog.action == "verified_post",
            ReputationLog.reference_id == post.id
        ).first()
        if not already_awarded:
            rep = ReputationLog(
                user_id=post.author_id,
                points=50,
                action="verified_post",
                reference_id=post.id
            )
            db.add(rep)
    elif not verify_in.is_verified and post.author_id:
        # Revoke reputation if un-verified
        db.query(ReputationLog).filter(
            ReputationLog.user_id == post.author_id,
            ReputationLog.action == "verified_post",
            ReputationLog.reference_id == post.id
        ).delete(synchronize_session=False)

    db.add(post)
    db.commit()
    db.refresh(post)

    return PostResponse.model_validate(post)


@router.get("/{post_id}/videos", response_model=List[RelatedVideo])
def get_related_videos(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Section 26: Get related technical videos linked to post category, tech stack & tags.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    now = datetime.now(timezone.utc)
    is_author_or_admin = current_user and (
        current_user.id == post.author_id or
        current_user.is_superuser or
        any(r.name in ["admin", "moderator"] for r in current_user.roles)
    )

    sched = post.scheduled_at
    if sched and sched.tzinfo is None:
        sched = sched.replace(tzinfo=timezone.utc)

    is_published = (
        post.status == PostStatus.APPROVED.value and
        (sched is None or sched <= now)
    )

    if not is_published and not is_author_or_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    category_name = post.category.name if (post and post.category) else "Backend"

    all_videos = [
        RelatedVideo(
            id="vid_01",
            title="FastAPI Microservices Architecture & Async SQLAlchemy 2.0",
            channel="Tech Architect VN",
            duration="28:45",
            thumbnail="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80",
            url="https://www.youtube.com/watch?v=kCgGjbgqYyU",
            views="14.2K",
            category="Backend"
        ),
        RelatedVideo(
            id="vid_02",
            title="React 19 & Next.js 15: Server Components & React Compiler Toàn Tập",
            channel="Frontend Masters VN",
            duration="34:10",
            thumbnail="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80",
            url="https://www.youtube.com/watch?v=8pDqJVdNa44",
            views="22.5K",
            category="Frontend"
        ),
        RelatedVideo(
            id="vid_03",
            title="Docker & Kubernetes: Triển khai ứng dụng Cloud-Native chuẩn Enterprise",
            channel="DevOps Vietnam",
            duration="45:20",
            thumbnail="https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=600&q=80",
            url="https://www.youtube.com/watch?v=Wf2eSG3owoA",
            views="18.9K",
            category="DevOps"
        ),
        RelatedVideo(
            id="vid_04",
            title="Tối ưu hóa Database PostgreSQL với Index B-Tree & Explain Analyze",
            channel="Database Pro",
            duration="22:15",
            thumbnail="https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&q=80",
            url="https://www.youtube.com/watch?v=cl4r09V0tE0",
            views="9.8K",
            category="Database"
        ),
        RelatedVideo(
            id="vid_05",
            title="Ứng dụng LLM & RAG với LangChain & FastAPI trong thực tế",
            channel="AI Engineering Lab",
            duration="40:05",
            thumbnail="https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&q=80",
            url="https://www.youtube.com/watch?v=9_jE0k4iY70",
            views="31.4K",
            category="AI / Machine Learning"
        )
    ]

    filtered = [v for v in all_videos if v.category.lower() in category_name.lower() or category_name.lower() in v.category.lower()]
    return filtered if filtered else all_videos[:3]


@router.post("/{post_id}/bot-comment")
def trigger_bot_comment(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Section 25: Engagement Bot triggers an automated helpful starter discussion or resource tip.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")

    now = datetime.now(timezone.utc)
    is_author_or_admin = (
        current_user.id == post.author_id or
        current_user.is_superuser or
        any(r.name in ["admin", "moderator"] for r in current_user.roles)
    )

    sched = post.scheduled_at
    if sched and sched.tzinfo is None:
        sched = sched.replace(tzinfo=timezone.utc)

    is_published = (
        post.status == PostStatus.APPROVED.value and
        (sched is None or sched <= now)
    )

    if not is_published and not is_author_or_admin:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")

    bot_user = db.query(User).filter(User.email == "techbot@itblog.dev").first()
    if not bot_user:
        bot_user = User(
            email="techbot@itblog.dev",
            username="techbot",
            name="🤖 AI TechBot",
            hashed_password="bot_service_account_secure_hash",
            bio="Trợ lý tự động hỗ trợ giải đáp kỹ thuật và gợi ý tài liệu học tập.",
            avatar="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80",
            is_active=True
        )
        db.add(bot_user)
        db.commit()
        db.refresh(bot_user)

    existing_bot_comment = db.query(Comment).filter(
        Comment.post_id == post.id,
        Comment.author_id == bot_user.id
    ).first()
    if existing_bot_comment:
        return {
            "message": "AI TechBot đã gửi bình luận hỗ trợ thành công.",
            "comment_id": existing_bot_comment.id,
            "content": existing_bot_comment.content
        }

    tech_version = post.tech_stack_version or (post.category.name if post.category else None)
    content = gemini_service.generate_bot_comment(post.title, post.content, tech_version)

    comment = Comment(
        post_id=post.id,
        author_id=bot_user.id,
        content=content,
        is_pinned=True
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "message": "AI TechBot đã gửi bình luận hỗ trợ thành công.",
        "comment_id": comment.id,
        "content": content
    }

