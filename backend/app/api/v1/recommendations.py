from typing import List, Optional
from datetime import datetime, timezone
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.core.database import get_db
from app.models.user import User
from app.models.post import Post, PostStatus, PostTag
from app.models.category import Category
from app.models.tag import Tag
from app.models.behavior import UserBehaviorEvent
from app.models.interaction import PostLike, Bookmark
from app.schemas.behavior import (
    BehaviorEventCreate,
    BehaviorEventResponse,
    RecommendedAuthorResponse,
    RecommendedTopicResponse
)
from app.schemas.post import PostListItem
from app.api.deps import get_current_user_optional

router = APIRouter(tags=["Recommendation & Behavior"])


def to_aware_utc(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


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
    Intelligent Hybrid Recommendation Algorithm:
    - User Category & Tag Affinity (weighted by bookmarks, likes, reads, views)
    - Social proof & engagement (views, likes, comments, bookmarks)
    - Pinned priority bonus
    - Time-decay gravity curve (Hacker News ranking formula)
    """
    now = datetime.now(timezone.utc)
    pool_query = (
        db.query(Post)
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
    )

    candidate_posts = pool_query.order_by(Post.created_at.desc()).limit(150).all()
    if not candidate_posts:
        return []

    cat_weights = {}
    user_tag_ids = set()
    if current_user:
        events = (
            db.query(UserBehaviorEvent)
            .filter(UserBehaviorEvent.user_id == current_user.id)
            .order_by(UserBehaviorEvent.created_at.desc())
            .limit(60)
            .all()
        )
        event_weight_map = {
            "bookmark": 5.0,
            "like": 4.0,
            "read_30s": 3.0,
            "comment": 3.5,
            "view": 1.0,
            "click_tag": 2.0
        }
        for ev in events:
            w = event_weight_map.get(ev.event_type, 1.0)
            if ev.category_id:
                cat_weights[ev.category_id] = cat_weights.get(ev.category_id, 0.0) + w
            if ev.tag_id:
                user_tag_ids.add(ev.tag_id)

    scored_posts = []
    for post in candidate_posts:
        views = post.views or 0
        likes_count = len(post.likes) if hasattr(post, "likes") and post.likes is not None else 0
        bookmarks_count = len(post.bookmarks) if hasattr(post, "bookmarks") and post.bookmarks is not None else 0
        comments_count = len(post.comments) if hasattr(post, "comments") and post.comments is not None else 0

        engagement = (views * 0.1) + (likes_count * 2.0) + (bookmarks_count * 3.0) + (comments_count * 2.5)

        cat_bonus = 0.0
        if post.category_id and post.category_id in cat_weights:
            cat_bonus = cat_weights[post.category_id] * 5.0

        tag_bonus = 0.0
        if user_tag_ids and hasattr(post, "post_tags") and post.post_tags:
            post_tag_ids = {t.tag_id for t in post.post_tags if getattr(t, "tag_id", None)}
            matching = len(post_tag_ids.intersection(user_tag_ids))
            tag_bonus = matching * 4.0

        pin_bonus = 50.0 if getattr(post, "is_pinned", False) else 0.0

        p_date = post.created_at
        if p_date.tzinfo is None:
            p_date = p_date.replace(tzinfo=timezone.utc)
        hours_old = max(0.1, (now - p_date).total_seconds() / 3600.0)
        decay = math.pow(hours_old + 2.0, 1.15)

        base_score = 10.0 + engagement + cat_bonus + tag_bonus + pin_bonus
        final_score = base_score / decay

        scored_posts.append((final_score, post))

    scored_posts.sort(key=lambda x: x[0], reverse=True)
    top_posts = [p[1] for p in scored_posts[:limit]]

    return [PostListItem.model_validate(p) for p in top_posts]


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

@router.get("/recommendations/related/{post_id}", response_model=List[PostListItem])
def get_related_recommendations(
    post_id: int,
    limit: int = Query(4, ge=1, le=10),
    db: Session = Depends(get_db)
):
    """
    Recommend related technical posts based on category and popularity.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    now = datetime.now(timezone.utc)
    related = (
        db.query(Post)
        .filter(
            Post.id != post_id,
            Post.status == PostStatus.APPROVED.value,
            Post.category_id == post.category_id,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .order_by(Post.views.desc(), Post.created_at.desc())
        .limit(limit)
        .all()
    )

    if len(related) < limit:
        excluded_ids = [p.id for p in related] + [post_id]
        more = (
            db.query(Post)
            .filter(
                Post.id.notin_(excluded_ids),
                Post.status == PostStatus.APPROVED.value,
                or_(Post.scheduled_at == None, Post.scheduled_at <= now)
            )
            .order_by(Post.views.desc(), Post.created_at.desc())
            .limit(limit - len(related))
            .all()
        )
        related.extend(more)

    return [PostListItem.model_validate(p) for p in related]
