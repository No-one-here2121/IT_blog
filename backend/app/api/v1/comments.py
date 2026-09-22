from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.comment import Comment, CommentLike
from app.models.post import Post, PostStatus
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.schemas.user import AuthorSummary
from app.api.deps import get_current_active_user, get_current_user_optional

from app.models.gamification import ReputationLog
from app.models.moderation import Report

router = APIRouter(tags=["Comments"])


def build_comment_tree(
    comments: List[Comment],
    current_user_id: Optional[int]
) -> List[CommentResponse]:
    """Recursively build nested comment tree with likes count and is_liked."""
    result = []
    for c in comments:
        likes_count = len(c.likes)
        is_liked = any(l.user_id == current_user_id for l in c.likes) if current_user_id else False

        replies = build_comment_tree(c.replies, current_user_id) if c.replies else []

        resp = CommentResponse(
            id=c.id,
            post_id=c.post_id,
            author=AuthorSummary.model_validate(c.author),
            parent_id=c.parent_id,
            content=c.content,
            is_edited=c.is_edited,
            is_accepted_answer=c.is_accepted_answer,
            is_pinned=c.is_pinned,
            likes_count=likes_count,
            is_liked=is_liked,
            replies=replies,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        result.append(resp)
    return result


@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
def get_post_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get top-level comments for a post, with nested replies hierarchy.
    Pinned and Accepted comments appear first.
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

    # Get root comments only (parent_id is None) prioritized by pinned and accepted
    root_comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id, Comment.parent_id == None)
        .order_by(
            desc(Comment.is_pinned),
            desc(Comment.is_accepted_answer),
            desc(Comment.created_at)
        )
        .all()
    )

    user_id = current_user.id if current_user else None
    return build_comment_tree(root_comments, user_id)


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new comment or reply to an existing comment.
    Automatically generates a Notification for post author or parent comment author.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bài viết để bình luận."
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
            detail="Không tìm thấy bài viết để bình luận."
        )

    parent_comment = None
    if comment_in.parent_id:
        parent_comment = db.query(Comment).filter(Comment.id == comment_in.parent_id).first()
        if not parent_comment or parent_comment.post_id != post_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bình luận cha không hợp lệ hoặc không thuộc bài viết này."
            )

    content = comment_in.content.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nội dung bình luận không được để trống."
        )

    new_comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        parent_id=comment_in.parent_id,
        content=content
    )
    db.add(new_comment)
    db.flush()

    # Trigger Notification
    notif = None
    if parent_comment and parent_comment.author_id != current_user.id:
        # Reply Notification
        notif = Notification(
            recipient_id=parent_comment.author_id,
            sender_id=current_user.id,
            type=NotificationType.REPLY.value,
            entity_id=post_id,
            entity_type="post",
            content=f"{current_user.name} đã trả lời bình luận của bạn trong bài viết '{post.title[:40]}...'"
        )
        db.add(notif)
    elif post.author_id != current_user.id:
        # Post Comment Notification
        notif = Notification(
            recipient_id=post.author_id,
            sender_id=current_user.id,
            type=NotificationType.COMMENT.value,
            entity_id=post_id,
            entity_type="post",
            content=f"{current_user.name} đã bình luận về bài viết '{post.title[:40]}...'"
        )
        db.add(notif)

    db.commit()
    db.refresh(new_comment)

    if notif:
        try:
            from app.api.v1.notifications import dispatch_realtime_notification
            dispatch_realtime_notification(notif.recipient_id, {
                "id": notif.id,
                "type": notif.type,
                "title": "Bình luận mới" if notif.type == NotificationType.COMMENT.value else "Phản hồi mới",
                "message": notif.content,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception:
            pass

    return CommentResponse(
        id=new_comment.id,
        post_id=new_comment.post_id,
        author=AuthorSummary.model_validate(current_user),
        parent_id=new_comment.parent_id,
        content=new_comment.content,
        is_edited=new_comment.is_edited,
        is_accepted_answer=new_comment.is_accepted_answer,
        is_pinned=new_comment.is_pinned,
        likes_count=0,
        is_liked=False,
        replies=[],
        created_at=new_comment.created_at,
        updated_at=new_comment.updated_at
    )


@router.put("/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    comment_in: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a comment. Only the author can edit their comment.
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bình luận."
        )

    if comment.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chỉnh sửa bình luận này."
        )

    clean_content = comment_in.content.strip()
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nội dung bình luận không được để trống."
        )

    comment.content = clean_content
    comment.is_edited = True
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        author=AuthorSummary.model_validate(comment.author),
        parent_id=comment.parent_id,
        content=comment.content,
        is_edited=comment.is_edited,
        is_accepted_answer=comment.is_accepted_answer,
        is_pinned=comment.is_pinned,
        likes_count=len(comment.likes),
        is_liked=any(l.user_id == current_user.id for l in comment.likes),
        replies=[],
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a comment. Author or admin/moderator can delete.
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bình luận."
        )

    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if comment.author_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa bình luận này."
        )

    db.query(CommentLike).filter(CommentLike.comment_id == comment_id).delete(synchronize_session=False)
    db.query(ReputationLog).filter(
        ReputationLog.reference_id == comment_id,
        ReputationLog.action == "accepted_answer"
    ).delete(synchronize_session=False)
    db.query(Notification).filter(
        Notification.entity_type == "comment",
        Notification.entity_id == comment_id
    ).delete(synchronize_session=False)
    db.query(Report).filter(
        Report.target_type == "comment",
        Report.target_id == comment_id
    ).delete(synchronize_session=False)
    db.query(Comment).filter(Comment.parent_id == comment_id).update({"parent_id": None}, synchronize_session=False)
    db.delete(comment)
    db.commit()
    return None


@router.post("/comments/{comment_id}/like")
def toggle_like_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Like or Unlike a comment.
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bình luận."
        )

    existing_like = db.query(CommentLike).filter(
        CommentLike.user_id == current_user.id,
        CommentLike.comment_id == comment_id
    ).first()

    if existing_like:
        db.delete(existing_like)
        db.commit()
        is_liked = False
    else:
        new_like = CommentLike(user_id=current_user.id, comment_id=comment_id)
        db.add(new_like)
        
        # Trigger notification
        if comment.author_id != current_user.id:
            notif = Notification(
                recipient_id=comment.author_id,
                sender_id=current_user.id,
                type=NotificationType.LIKE.value,
                entity_id=comment.post_id,
                entity_type="comment",
                content=f"{current_user.name} đã thích bình luận của bạn."
            )
            db.add(notif)
            db.commit()
            try:
                from app.api.v1.notifications import dispatch_realtime_notification
                dispatch_realtime_notification(notif.recipient_id, {
                    "id": notif.id,
                    "type": notif.type,
                    "title": "Lượt thích bình luận mới",
                    "message": notif.content,
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            except Exception:
                pass
        else:
            db.commit()

        is_liked = True

    likes_count = db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()
    return {"is_liked": is_liked, "likes_count": likes_count}


@router.post("/comments/{comment_id}/pin")
def toggle_pin_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Technical Discussion: Pin high-value answer or discussion to the top.
    Only the post author or admin/moderator can pin/unpin comments.
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bình luận."
        )

    post = db.query(Post).filter(Post.id == comment.post_id).first()
    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if not post or (post.author_id != current_user.id and not is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tác giả bài viết hoặc quản trị viên mới có quyền ghim bình luận."
        )

    comment.is_pinned = not comment.is_pinned
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {"comment_id": comment.id, "is_pinned": comment.is_pinned}


@router.post("/comments/{comment_id}/accept")
def toggle_accept_answer(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Technical Discussion: Mark a solution as 'Accepted Answer'.
    Only the post author can mark/unmark an accepted answer.
    Awards +20 reputation points to the comment author when marked!
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy câu trả lời."
        )

    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if not post or post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tác giả của bài viết mới có quyền đánh dấu câu trả lời chuẩn (Accepted Answer)."
        )

    new_state = not comment.is_accepted_answer

    # If setting to True, reset other comments on this post to False
    if new_state:
        db.query(Comment).filter(
            Comment.post_id == post.id,
            Comment.id != comment_id
        ).update({"is_accepted_answer": False}, synchronize_session=False)

        # Award reputation to comment author if not already awarded
        if comment.author_id != current_user.id:
            already_awarded = db.query(ReputationLog).filter(
                ReputationLog.user_id == comment.author_id,
                ReputationLog.action == "accepted_answer",
                ReputationLog.reference_id == comment.id
            ).first()
            if not already_awarded:
                rep = ReputationLog(
                    user_id=comment.author_id,
                    points=20,
                    action="accepted_answer",
                    reference_id=comment.id
                )
                db.add(rep)
    else:
        # Revoke reputation if unmarked
        if comment.author_id != current_user.id:
            db.query(ReputationLog).filter(
                ReputationLog.user_id == comment.author_id,
                ReputationLog.action == "accepted_answer",
                ReputationLog.reference_id == comment.id
            ).delete(synchronize_session=False)

    comment.is_accepted_answer = new_state
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {"comment_id": comment.id, "is_accepted_answer": comment.is_accepted_answer}

