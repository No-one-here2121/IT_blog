from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from app.core.database import get_db
from app.models.post import Post, PostStatus, PostTag
from app.models.interaction import Follow, PostLike, Bookmark
from app.models.behavior import UserBehaviorEvent
from app.models.tag import Tag
import math
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
    Feed For You - Dynamic Multi-Signal Recommendation Engine (TikTok & Facebook Inspired):
    1. Signals: Dwell time (read_30s, read_deep), reactions (like, bookmark, comment, share), author follow.
    2. Real-time scoring: Category & Tag affinity vector + Viral momentum boost + Time decay + Serendipity.
    3. MMR Re-ranking: Dynamic category interleaving and suppression of heavily consumed posts.
    """
    now = datetime.now(timezone.utc)
    base_query = db.query(Post).filter(
        Post.status == PostStatus.APPROVED.value,
        or_(Post.scheduled_at == None, Post.scheduled_at <= now)
    )
    total_approved = base_query.count()
    if total_approved == 0:
        return PaginatedPostResponse(items=[], total=0, page=page, limit=limit, total_pages=1)

    # 1. Build User Affinity Vector from multi-source signals
    cat_affinity = {}
    tag_affinity = {}
    author_affinity = {}
    seen_deep_ids = set()

    if current_user:
        # A. Behavior events (views, dwell time, deep reads)
        events = (
            db.query(UserBehaviorEvent)
            .filter(UserBehaviorEvent.user_id == current_user.id)
            .order_by(UserBehaviorEvent.created_at.desc())
            .limit(100)
            .all()
        )
        event_weights = {
            "share": 12.0,
            "bookmark": 10.0,
            "comment": 9.0,
            "like": 8.0,
            "read_deep": 10.0,
            "read_30s": 6.0,
            "scroll_deep": 5.0,
            "click_tag": 3.0,
            "view": 1.5,
            "quick_skip": -3.0
        }
        for ev in events:
            w = event_weights.get(ev.event_type.lower(), 1.0)
            if ev.category_id:
                cat_affinity[ev.category_id] = cat_affinity.get(ev.category_id, 0.0) + w
            if ev.tag_id:
                tag_affinity[ev.tag_id] = tag_affinity.get(ev.tag_id, 0.0) + w
            if ev.post_id and ev.event_type.lower() in ["read_30s", "read_deep", "scroll_deep", "bookmark"]:
                seen_deep_ids.add(ev.post_id)

        # B. Social interactions (Likes, Bookmarks, Follows)
        liked_posts = (
            db.query(Post.id, Post.category_id, Post.author_id)
            .join(PostLike, PostLike.post_id == Post.id)
            .filter(PostLike.user_id == current_user.id)
            .limit(50)
            .all()
        )
        for _, cid, aid in liked_posts:
            if cid:
                cat_affinity[cid] = cat_affinity.get(cid, 0.0) + 7.0
            if aid:
                author_affinity[aid] = author_affinity.get(aid, 0.0) + 8.0

        bookmarked_posts = (
            db.query(Post.id, Post.category_id, Post.author_id)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .filter(Bookmark.user_id == current_user.id)
            .limit(50)
            .all()
        )
        for pid, cid, aid in bookmarked_posts:
            seen_deep_ids.add(pid)
            if cid:
                cat_affinity[cid] = cat_affinity.get(cid, 0.0) + 9.0
            if aid:
                author_affinity[aid] = author_affinity.get(aid, 0.0) + 10.0

        followed_authors = [
            f.following_id for f in db.query(Follow.following_id).filter(Follow.follower_id == current_user.id).all()
        ]
        for aid in followed_authors:
            author_affinity[aid] = author_affinity.get(aid, 0.0) + 15.0

    # 2. Candidate Retrieval: Fetch pool of candidate posts (up to 200 posts)
    # Prefer recently created and active posts
    candidates = base_query.order_by(Post.created_at.desc()).limit(200).all()

    # 3. Multi-Factor Scoring (TikTok / Facebook EdgeRank Formula)
    scored_candidates = []
    user_seed = current_user.id if current_user else 42

    for p in candidates:
        views = p.views or 0
        likes_cnt = len(p.likes) if hasattr(p, "likes") and p.likes else 0
        bookmarks_cnt = len(p.bookmarks) if hasattr(p, "bookmarks") and p.bookmarks else 0
        comments_cnt = len(p.comments) if hasattr(p, "comments") and p.comments else 0
        shares_cnt = p.shares_count if hasattr(p, "shares_count") and p.shares_count else 0

        # Base Engagement score
        engagement = (views * 0.05) + (likes_cnt * 2.5) + (bookmarks_cnt * 3.5) + (comments_cnt * 3.0) + (shares_cnt * 4.0)

        # Personal Affinity Component
        cat_bonus = 0.0
        if p.category_id and p.category_id in cat_affinity:
            cat_bonus = min(60.0, cat_affinity[p.category_id] * 2.0)

        tag_bonus = 0.0
        if tag_affinity and hasattr(p, "post_tags") and p.post_tags:
            for pt in p.post_tags:
                if getattr(pt, "tag_id", None) in tag_affinity:
                    tag_bonus += tag_affinity[pt.tag_id] * 2.5
            tag_bonus = min(50.0, tag_bonus)

        author_bonus = 0.0
        if p.author_id and p.author_id in author_affinity:
            author_bonus = min(40.0, author_affinity[p.author_id] * 2.0)

        # Pinned & Verified bonuses
        pin_bonus = 60.0 if getattr(p, "is_pinned", False) else 0.0
        verified_bonus = 25.0 if getattr(p, "is_verified", False) else 0.0

        # Time decay & Viral Velocity
        p_dt = p.created_at
        if p_dt.tzinfo is None:
            p_dt = p_dt.replace(tzinfo=timezone.utc)
        hours_old = max(0.2, (now - p_dt).total_seconds() / 3600.0)

        viral_momentum = 0.0
        if hours_old <= 72.0:
            velocity = (likes_cnt * 3.0 + comments_cnt * 2.0 + views * 0.1) / (hours_old + 1.0)
            viral_momentum = min(35.0, velocity * 4.0)

        decay = math.pow(hours_old + 2.0, 1.12)

        # TikTok Exploration / Serendipity (Deterministic Hash per user to break filter bubbles)
        serendipity_hash = ((p.id * 2654435761) ^ (user_seed * 40503)) % 100
        serendipity_bonus = (serendipity_hash / 100.0) * 8.0

        # Seen / Read suppression: lower score for already consumed posts so new articles appear first
        seen_penalty = 30.0 if p.id in seen_deep_ids else 0.0

        raw_score = 15.0 + engagement + cat_bonus + tag_bonus + author_bonus + pin_bonus + verified_bonus + viral_momentum + serendipity_bonus - seen_penalty
        final_score = max(0.1, raw_score) / decay

        scored_candidates.append({
            "score": final_score,
            "post": p,
            "category_id": p.category_id,
            "author_id": p.author_id
        })

    # 4. Re-Ranking with Diversity / Anti-Fatigue (Maximal Marginal Relevance)
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)

    diversified = []
    consecutive_cat_count = 0
    last_cat_id = None

    for item in scored_candidates:
        cid = item["category_id"]
        if cid and cid == last_cat_id:
            consecutive_cat_count += 1
        else:
            consecutive_cat_count = 1
            last_cat_id = cid

        # If more than 2 consecutive posts have the same category, push back slightly
        if consecutive_cat_count > 2:
            item["score"] *= 0.6

        diversified.append(item)

    # Final sort after diversity adjustment
    diversified.sort(key=lambda x: x["score"], reverse=True)
    all_ranked_posts = [item["post"] for item in diversified]

    total = len(all_ranked_posts)
    offset = (page - 1) * limit
    page_posts = all_ranked_posts[offset : offset + limit]

    items = [PostListItem.model_validate(p) for p in page_posts]
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
