from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.interaction import PostLike, Bookmark, Follow
from app.models.post import Post, PostStatus
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.schemas.interaction import (
    LikeResponse,
    BookmarkResponse,
    FollowResponse,
    FollowerListResponse,
    BookmarkedPostsResponse
)
from app.schemas.post import PostListItem
from app.schemas.user import AuthorSummary
from app.api.deps import get_current_active_user

router = APIRouter(tags=["Interactions"])


# 1. Post Like / Unlike
@router.post("/posts/{post_id}/like", response_model=LikeResponse)
def toggle_like_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Toggle Like/Unlike for a post. Triggers Notification to post author.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    existing_like = db.query(PostLike).filter(
        PostLike.user_id == current_user.id,
        PostLike.post_id == post_id
    ).first()

    if existing_like:
        db.delete(existing_like)
        db.commit()
        is_liked = False
    else:
        new_like = PostLike(user_id=current_user.id, post_id=post_id)
        db.add(new_like)

        # Trigger notification
        if post.author_id != current_user.id:
            notif = Notification(
                recipient_id=post.author_id,
                sender_id=current_user.id,
                type=NotificationType.LIKE.value,
                entity_id=post_id,
                entity_type="post",
                content=f"{current_user.name} đã thích bài viết của bạn: '{post.title[:40]}...'"
            )
            db.add(notif)
            db.commit()
            try:
                from app.api.v1.notifications import dispatch_realtime_notification
                dispatch_realtime_notification(notif.recipient_id, {
                    "id": notif.id,
                    "type": notif.type,
                    "title": "Lượt thích bài viết mới",
                    "message": notif.content,
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            except Exception:
                pass
        else:
            db.commit()
        is_liked = True

    likes_count = db.query(PostLike).filter(PostLike.post_id == post_id).count()
    return LikeResponse(is_liked=is_liked, likes_count=likes_count)


# 2. Post Bookmark / Unbookmark
@router.post("/posts/{post_id}/bookmark", response_model=BookmarkResponse)
def toggle_bookmark_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Save or remove post from current user's reading list.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết."
        )

    existing_bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.post_id == post_id
    ).first()

    if existing_bookmark:
        db.delete(existing_bookmark)
        db.commit()
        is_bookmarked = False
    else:
        new_bookmark = Bookmark(user_id=current_user.id, post_id=post_id)
        db.add(new_bookmark)
        db.commit()
        is_bookmarked = True

    return BookmarkResponse(is_bookmarked=is_bookmarked)


# 3. Get My Bookmarked Posts
@router.get("/users/me/bookmarks", response_model=BookmarkedPostsResponse)
def get_my_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all posts bookmarked by current user.
    """
    bookmarks = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == current_user.id)
        .order_by(desc(Bookmark.created_at))
        .all()
    )
    now = datetime.now(timezone.utc)
    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    posts = []
    for b in bookmarks:
        p = b.post
        if not p:
            continue
        sched = p.scheduled_at
        if sched and sched.tzinfo is None:
            sched = sched.replace(tzinfo=timezone.utc)
        is_published = (p.status == PostStatus.APPROVED.value and (sched is None or sched <= now))
        if is_published or p.author_id == current_user.id or is_admin:
            posts.append(PostListItem.model_validate(p))
    return BookmarkedPostsResponse(items=posts, total=len(posts))


# 4. Follow / Unfollow User
@router.post("/users/{user_id}/follow", response_model=FollowResponse)
def toggle_follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Follow or unfollow an author. Triggers Notification to author.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự theo dõi chính mình."
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tác giả này."
        )

    if not target_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể theo dõi người dùng đã bị vô hiệu hóa hoặc bị khóa."
        )

    existing_follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()

    if existing_follow:
        db.delete(existing_follow)
        db.commit()
        is_following = False
    else:
        new_follow = Follow(follower_id=current_user.id, following_id=user_id)
        db.add(new_follow)

        # Trigger notification
        notif = Notification(
            recipient_id=user_id,
            sender_id=current_user.id,
            type=NotificationType.FOLLOW.value,
            entity_id=current_user.id,
            entity_type="user",
            content=f"{current_user.name} đã bắt đầu theo dõi bạn."
        )
        db.add(notif)
        db.commit()
        try:
            from app.api.v1.notifications import dispatch_realtime_notification
            dispatch_realtime_notification(notif.recipient_id, {
                "id": notif.id,
                "type": notif.type,
                "title": "Người theo dõi mới",
                "message": notif.content,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception:
            pass
        is_following = True

    followers_count = db.query(Follow).filter(Follow.following_id == user_id).count()
    return FollowResponse(is_following=is_following, followers_count=followers_count)


# 5. List Followers
@router.get("/users/{user_id}/followers", response_model=FollowerListResponse)
def get_user_followers(user_id: int, db: Session = Depends(get_db)):
    """
    Get list of users following this user.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng này."
        )

    follows = db.query(Follow).filter(Follow.following_id == user_id).all()
    followers = [AuthorSummary.model_validate(f.follower) for f in follows if f.follower is not None]
    return FollowerListResponse(items=followers, total=len(followers))


# 6. List Following
@router.get("/users/{user_id}/following", response_model=FollowerListResponse)
def get_user_following(user_id: int, db: Session = Depends(get_db)):
    """
    Get list of authors this user is following.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng này."
        )

    follows = db.query(Follow).filter(Follow.follower_id == user_id).all()
    following = [AuthorSummary.model_validate(f.following) for f in follows if f.following is not None]
    return FollowerListResponse(items=following, total=len(following))
