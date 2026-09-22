from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.core.database import get_db
from app.models.user import User
from app.models.post import Post, PostStatus
from app.models.gamification import Badge, UserBadge, ReputationLog
from app.schemas.gamification import (
    BadgeResponse,
    LeaderboardUserResponse,
    UserReputationStats,
    ReputationLogResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/gamification", tags=["Gamification"])

DEFAULT_BADGES = [
    {"name": "Thực tập sinh tiềm năng", "slug": "junior-dev", "description": "Gia nhập nền tảng IT Blog và đăng bài viết đầu tiên.", "icon": "GraduationCap", "points_required": 10},
    {"name": "Tác giả uy tín (Verified Author)", "slug": "verified-author", "description": "Có bài viết được chuyên gia kiểm chứng chuẩn kỹ thuật.", "icon": "CheckCircle2", "points_required": 50},
    {"name": "Chiến thần đóng góp (Top Contributor)", "slug": "top-contributor", "description": "Đạt mốc 100 điểm uy tín từ các bài viết chất lượng.", "icon": "Award", "points_required": 100},
    {"name": "Bậc thầy giải thuật (Algorithm Master)", "slug": "algorithm-master", "description": "Có câu trả lời kỹ thuật được đánh dấu Accepted Answer.", "icon": "Zap", "points_required": 250},
    {"name": "Kiến trúc sư hệ thống (Architecture Guru)", "slug": "tech-guru", "description": "Đạt trên 1,000 điểm uy tín với các đóng góp cốt lõi cho cộng đồng.", "icon": "Crown", "points_required": 1000}
]


def ensure_default_badges(db: Session):
    count = db.query(Badge).count()
    if count == 0:
        for b in DEFAULT_BADGES:
            badge = Badge(**b)
            db.add(badge)
        db.commit()


@router.get("/badges", response_model=List[BadgeResponse])
def get_all_badges(db: Session = Depends(get_db)):
    """
    Get all achievements & badges available in the platform.
    """
    ensure_default_badges(db)
    return db.query(Badge).order_by(Badge.points_required.asc()).all()


@router.get("/leaderboard", response_model=List[LeaderboardUserResponse])
def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Top authors ranking based on reputation points, badges, and posts.
    """
    ensure_default_badges(db)

    now = datetime.now(timezone.utc)
    # Pre-fetch total reputation points per user
    rep_sums = dict(
        db.query(ReputationLog.user_id, func.coalesce(func.sum(ReputationLog.points), 0))
        .group_by(ReputationLog.user_id)
        .all()
    )
    # Pre-fetch approved post counts per user (excluding future scheduled posts)
    post_counts = dict(
        db.query(Post.author_id, func.count(Post.id))
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .group_by(Post.author_id)
        .all()
    )
    # Pre-fetch badge counts per user
    badge_counts = dict(
        db.query(UserBadge.user_id, func.count(UserBadge.id))
        .group_by(UserBadge.user_id)
        .all()
    )

    # Get users with reputation or posts
    users = db.query(User).filter(User.is_active == True).all()

    leaderboard = []
    for user in users:
        user_points_record = rep_sums.get(user.id, 0)
        posts_count = post_counts.get(user.id, 0)
        badges_count = badge_counts.get(user.id, 0)

        # If user has no reputation logs yet, give baseline points based on posts (10 pts per post)
        if user_points_record == 0 and posts_count > 0:
            user_points_record = posts_count * 10

        leaderboard.append({
            "user_id": user.id,
            "username": user.username,
            "name": user.name,
            "avatar": user.avatar,
            "reputation_points": user_points_record,
            "badges_count": badges_count,
            "posts_count": posts_count
        })

    # Sort descending by reputation_points, then posts_count
    leaderboard.sort(key=lambda x: (x["reputation_points"], x["posts_count"]), reverse=True)

    results = []
    for rank, item in enumerate(leaderboard[:limit], start=1):
        results.append(LeaderboardUserResponse(
            rank=rank,
            user_id=item["user_id"],
            username=item["username"],
            name=item["name"],
            avatar=item["avatar"],
            reputation_points=item["reputation_points"],
            badges_count=item["badges_count"],
            posts_count=item["posts_count"]
        ))

    return results


@router.get("/users/{user_id}/reputation", response_model=UserReputationStats)
def get_user_reputation(user_id: int, db: Session = Depends(get_db)):
    """
    Get detailed reputation statistics, badges, and history logs for a specific user.
    """
    ensure_default_badges(db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại hoặc đã bị khóa.")

    # Pre-fetch total reputation points per user
    rep_sums = dict(
        db.query(ReputationLog.user_id, func.coalesce(func.sum(ReputationLog.points), 0))
        .group_by(ReputationLog.user_id)
        .all()
    )
    now = datetime.now(timezone.utc)
    post_counts = dict(
        db.query(Post.author_id, func.count(Post.id))
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .group_by(Post.author_id)
        .all()
    )

    total_points = rep_sums.get(user_id, 0)
    user_post_count = post_counts.get(user_id, 0)
    if total_points == 0 and user_post_count > 0:
        total_points = user_post_count * 10

    # User badges
    user_badges = db.query(UserBadge).filter(UserBadge.user_id == user_id).all()
    badges = [ub.badge for ub in user_badges]

    # Recent logs
    logs = db.query(ReputationLog).filter(ReputationLog.user_id == user_id).order_by(ReputationLog.created_at.desc()).limit(10).all()

    # Calculate rank based on identical leaderboard criteria
    all_active_users = db.query(User.id).filter(User.is_active == True).all()
    scores = []
    for (u_id,) in all_active_users:
        pts = rep_sums.get(u_id, 0)
        p_cnt = post_counts.get(u_id, 0)
        if pts == 0 and p_cnt > 0:
            pts = p_cnt * 10
        scores.append((u_id, pts, p_cnt))

    scores.sort(key=lambda x: (x[1], x[2]), reverse=True)
    rank = 1
    for idx, (uid, _, _) in enumerate(scores, start=1):
        if uid == user_id:
            rank = idx
            break

    return UserReputationStats(
        user_id=user.id,
        username=user.username,
        name=user.name,
        avatar=user.avatar,
        total_points=total_points,
        rank=rank,
        badges=badges,
        recent_logs=logs
    )
