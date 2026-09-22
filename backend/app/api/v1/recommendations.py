from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.core.database import get_db
from app.models.user import User
from app.models.post import Post, PostStatus, PostTag
from app.models.category import Category
from app.models.tag import Tag
from app.models.behavior import UserBehaviorEvent
from app.schemas.behavior import (
    BehaviorEventCreate,
    BehaviorEventResponse,
    RecommendedAuthorResponse,
    RecommendedTopicResponse
)
from app.schemas.post import PostListItem
from app.api.deps import get_current_user_optional

router = APIRouter(tags=["Recommendation & Behavior"])


@router.post("/behavior/events", response_model=BehaviorEventResponse, status_code=status.HTTP_201_CREATED)
@router.post("/behavior/track", response_model=BehaviorEventResponse, status_code=status.HTTP_201_CREATED)
def record_behavior_event(
    data: BehaviorEventCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Ingest user interaction signals (view, read_30s, like, bookmark, click_tag).
    """
    post_id = data.post_id
    if post_id and not db.query(Post.id).filter(Post.id == post_id).first():
        post_id = None

    category_id = data.category_id
    if category_id and not db.query(Category.id).filter(Category.id == category_id).first():
        category_id = None

    tag_id = data.tag_id
    if tag_id and not db.query(Tag.id).filter(Tag.id == tag_id).first():
        tag_id = None

    event = UserBehaviorEvent(
        user_id=current_user.id if current_user else None,
        event_type=data.event_type.lower(),
        post_id=post_id,
        category_id=category_id,
        tag_id=tag_id,
        metadata_json=data.metadata_json
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/recommendations/feed", response_model=List[PostListItem])
def get_recommended_feed(
    limit: int = Query(default=9, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Personalized 'For You' feed using interaction signals from user_behavior_events.
    """
    now = datetime.now(timezone.utc)
    if current_user:
        # Find top categories user interacted with
        top_cats = (
            db.query(UserBehaviorEvent.category_id, func.count(UserBehaviorEvent.id).label("cnt"))
            .filter(UserBehaviorEvent.user_id == current_user.id, UserBehaviorEvent.category_id != None)
            .group_by(UserBehaviorEvent.category_id)
            .order_by(desc("cnt"))
            .limit(3)
            .all()
        )
        cat_ids = [c[0] for c in top_cats if c[0] is not None]
        if cat_ids:
            posts = (
                db.query(Post)
                .filter(
                    Post.status == PostStatus.APPROVED.value,
                    Post.category_id.in_(cat_ids),
                    or_(Post.scheduled_at == None, Post.scheduled_at <= now)
                )
                .order_by(Post.views.desc(), Post.created_at.desc())
                .limit(limit)
                .all()
            )
            if len(posts) >= 3:
                return [PostListItem.model_validate(p) for p in posts]

    # Fallback to general popular & recent approved posts
    fallback_posts = (
        db.query(Post)
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .order_by(Post.views.desc(), Post.created_at.desc())
        .limit(limit)
        .all()
    )
    return [PostListItem.model_validate(p) for p in fallback_posts]


@router.get("/recommendations/authors", response_model=List[RecommendedAuthorResponse])
def get_recommended_authors(
    limit: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Recommend prominent authors based on community reputation and post count.
    """
    query = db.query(User).filter(User.is_active == True)
    if current_user:
        query = query.filter(User.id != current_user.id)

    now = datetime.now(timezone.utc)
    users = query.limit(limit).all()
    user_ids = [u.id for u in users]
    posts_counts = {}
    if user_ids:
        posts_counts = dict(
            db.query(Post.author_id, func.count(Post.id))
            .filter(
                Post.author_id.in_(user_ids),
                Post.status == PostStatus.APPROVED.value,
                or_(Post.scheduled_at == None, Post.scheduled_at <= now)
            )
            .group_by(Post.author_id)
            .all()
        )

    results = []
    for u in users:
        posts_count = posts_counts.get(u.id, 0)
        results.append(RecommendedAuthorResponse(
            user_id=u.id,
            username=u.username,
            name=u.name,
            avatar=u.avatar,
            affinity_score=min(1.0, 0.2 + (posts_count * 0.1)),
            reason=f"Tác giả năng động với {posts_count} bài viết chuyên môn trên nền tảng"
        ))
    return results


@router.get("/recommendations/topics", response_model=List[RecommendedTopicResponse])
def get_recommended_topics(
    limit: int = Query(default=6, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Recommend technical topics and categories.
    """
    now = datetime.now(timezone.utc)
    categories = db.query(Category).limit(limit).all()
    cat_ids = [cat.id for cat in categories]
    cat_counts = {}
    if cat_ids:
        cat_counts = dict(
            db.query(Post.category_id, func.count(Post.id))
            .filter(
                Post.category_id.in_(cat_ids),
                Post.status == PostStatus.APPROVED.value,
                or_(Post.scheduled_at == None, Post.scheduled_at <= now)
            )
            .group_by(Post.category_id)
            .all()
        )

    results = []
    for cat in categories:
        p_count = cat_counts.get(cat.id, 0)
        results.append(RecommendedTopicResponse(
            category_id=cat.id,
            category_name=cat.name,
            post_count=p_count,
            interest_score=round(min(1.0, 0.4 + (p_count * 0.05)), 2)
        ))
    return results
