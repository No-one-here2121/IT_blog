from datetime import datetime, timezone, timedelta
import math
from app.models.post import Post, PostStatus
from app.models.comment import Comment
from app.models.behavior import UserBehaviorEvent
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserUpdate, UserResponse, UserPublicResponse, UserActivityResponse, ReadHistoryItem, DayContributionItem
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update profile details (name, avatar, bio) for current authenticated user.
    """
    if user_update.name is not None:
        clean_name = user_update.name.strip()
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên hiển thị không được để trống."
            )
        current_user.name = clean_name
    
    if user_update.avatar is not None and user_update.avatar.strip():
        current_user.avatar = user_update.avatar.strip()

    if user_update.bio is not None:
        current_user.bio = user_update.bio.strip()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.get("/me", response_model=UserResponse)
def get_my_user_profile(current_user: User = Depends(get_current_active_user)):
    """
    Retrieve profile details for the currently authenticated user at /users/me.
    """
    return UserResponse.model_validate(current_user)


@router.get("/{identifier}", response_model=UserPublicResponse)
def get_user_by_identifier(identifier: str, db: Session = Depends(get_db)):
    """
    Retrieve public profile of a user by username or numeric ID.
    """
    user = None
    if identifier.isdigit():
        user = db.query(User).filter(User.id == int(identifier)).first()
    elif identifier in ["demo_admin", "admin"]:
        user = db.query(User).filter(or_(User.username == "admin", User.is_superuser == True)).first()
    elif identifier in ["demo_moderator", "mod", "moderator"]:
        user = db.query(User).filter(or_(User.username == "mod_dev", User.email == "mod@itblog.dev")).first()
    elif identifier in ["demo_user", "hoang.dev"]:
        user = db.query(User).filter(or_(User.username == "hoang_dev", User.email == "hoang.dev@itblog.vn")).first()
    if not user:
        user = db.query(User).filter(User.username == identifier.lower()).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng này."
        )

    return UserPublicResponse.model_validate(user)



@router.get("/{identifier}/activity", response_model=UserActivityResponse)
def get_user_activity(identifier: str, db: Session = Depends(get_db)):
    """
    Retrieve 100% REAL developer activity heatmap, contributions, streaks, and reading history for any user account.
    """
    user = None
    if identifier.isdigit():
        user = db.query(User).filter(User.id == int(identifier)).first()
    elif identifier in ["demo_admin", "admin"]:
        user = db.query(User).filter(or_(User.username == "admin", User.is_superuser == True)).first()
    elif identifier in ["demo_moderator", "mod", "moderator"]:
        user = db.query(User).filter(or_(User.username == "mod_dev", User.email == "mod@itblog.dev")).first()
    elif identifier in ["demo_user", "hoang.dev"]:
        user = db.query(User).filter(or_(User.username == "hoang_dev", User.email == "hoang.dev@itblog.vn")).first()
    if not user:
        user = db.query(User).filter(User.username == identifier.lower()).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KhÃ´ng tÃ¬m tháº¥y ngÆ°á» i dÃ¹ng nÃ y."
        )

    uid = user.id
    now = datetime.now(timezone.utc)
    today = now.date()

    dates_map = {}
    read_dates = set()

    # 1. Real Posts published by user (+2 contributions per post)
    user_posts = db.query(Post.created_at).filter(
        Post.author_id == uid,
        Post.status == PostStatus.APPROVED.value
    ).all()
    for (p_date,) in user_posts:
        if p_date:
            d_str = p_date.strftime("%Y-%m-%d")
            dates_map[d_str] = dates_map.get(d_str, 0) + 2

    # 2. Real Comments written by user (+1 contribution per comment)
    user_comments = db.query(Comment.created_at).filter(Comment.author_id == uid).all()
    for (c_date,) in user_comments:
        if c_date:
            d_str = c_date.strftime("%Y-%m-%d")
            dates_map[d_str] = dates_map.get(d_str, 0) + 1

    # 3. Real Behavior events (views / read_30s) by user (+1 contribution)
    user_views = db.query(
        UserBehaviorEvent.post_id,
        UserBehaviorEvent.created_at
    ).filter(
        UserBehaviorEvent.user_id == uid,
        UserBehaviorEvent.event_type.in_(["view", "read_30s"])
    ).order_by(UserBehaviorEvent.created_at.desc()).all()

    for p_id, v_date in user_views:
        if v_date:
            d_str = v_date.strftime("%Y-%m-%d")
            dates_map[d_str] = dates_map.get(d_str, 0) + 1
            read_dates.add(d_str)

    # 4. Generate 16 weeks (112 days) of daily contribution grid
    all_days = []
    total_contrib = 0

    for i in range(111, -1, -1):
        cur_date = today - timedelta(days=i)
        d_str = cur_date.strftime("%Y-%m-%d")
        cnt = dates_map.get(d_str, 0)
        total_contrib += cnt

        level = 0
        if cnt >= 5:
            level = 4
        elif cnt >= 3:
            level = 3
        elif cnt >= 2:
            level = 2
        elif cnt >= 1:
            level = 1

        all_days.append(DayContributionItem(
            date=d_str,
            display_date=cur_date.strftime("%d/%m/%Y"),
            count=cnt,
            level=level,
            day_of_week=cur_date.weekday()
        ))

    weeks = []
    for w in range(16):
        weeks.append(all_days[w * 7:(w + 1) * 7])

    # 5. Calculate real continuous contribution streak & max streak
    max_streak = 0
    cur_temp = 0
    for day_item in all_days:
        if day_item.count > 0:
            cur_temp += 1
            if cur_temp > max_streak:
                max_streak = cur_temp
        else:
            cur_temp = 0

    current_streak = 0
    today_has = dates_map.get(today.strftime("%Y-%m-%d"), 0) > 0
    yesterday = today - timedelta(days=1)
    yesterday_has = dates_map.get(yesterday.strftime("%Y-%m-%d"), 0) > 0

    if today_has or yesterday_has:
        check_d = today if today_has else yesterday
        while dates_map.get(check_d.strftime("%Y-%m-%d"), 0) > 0:
            current_streak += 1
            check_d = check_d - timedelta(days=1)

    # 6. Calculate real reading streak
    reading_streak = 0
    today_read = today.strftime("%Y-%m-%d") in read_dates
    yesterday_read = yesterday.strftime("%Y-%m-%d") in read_dates
    if today_read or yesterday_read:
        check_d = today if today_read else yesterday
        while check_d.strftime("%Y-%m-%d") in read_dates:
            reading_streak += 1
            check_d = check_d - timedelta(days=1)

    # 7. Extract unique recent read posts
    seen_posts = set()
    reading_history = []
    for p_id, v_date in user_views:
        if not p_id or p_id in seen_posts:
            continue
        seen_posts.add(p_id)
        post = db.query(Post).filter(Post.id == p_id).first()
        if post:
            category_name = post.category.name if post.category else "CÃ´ng nghá»‡"
            words = len((post.content or "").split())
            read_time = f"{max(1, math.ceil(words / 200))} phÃºt Ä‘á» c"
            reading_history.append(ReadHistoryItem(
                id=post.id,
                title=post.title,
                category=category_name,
                cover_image=post.cover_image,
                read_time=read_time,
                read_at=v_date.isoformat() if v_date else datetime.now(timezone.utc).isoformat()
            ))
        if len(reading_history) >= 30:
            break

    return UserActivityResponse(
        user_id=user.id,
        username=user.username,
        total_contributions=total_contrib,
        current_streak=current_streak,
        max_streak=max_streak,
        reading_streak=reading_streak,
        heatmap_weeks=weeks,
        reading_history=reading_history
    )
