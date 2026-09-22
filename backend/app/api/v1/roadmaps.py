from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from slugify import slugify

from app.core.database import get_db
from app.models.user import User
from app.models.category import Category
from app.models.post import Post
from app.models.roadmap import Roadmap, RoadmapStep, UserRoadmapProgress
from app.schemas.roadmap import (
    RoadmapCreate,
    RoadmapResponse,
    RoadmapDetailResponse,
    RoadmapStepResponse,
    StepToggleResponse
)
from app.api.deps import get_current_active_user, get_current_user_optional

router = APIRouter(prefix="/roadmaps", tags=["Roadmaps"])


@router.get("", response_model=List[RoadmapResponse])
def get_roadmaps(
    level: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    List all learning roadmaps with level filtering and user completion progress.
    """
    query = db.query(Roadmap)
    if level:
        query = query.filter(Roadmap.level == level.lower())
    if category_id:
        query = query.filter(Roadmap.category_id == category_id)

    roadmaps = query.order_by(Roadmap.created_at.desc()).all()
    results = []

    # Pre-fetch user progress per roadmap in a single batch query
    completed_counts = {}
    if current_user:
        completed_counts = dict(
            db.query(UserRoadmapProgress.roadmap_id, func.count(UserRoadmapProgress.id))
            .filter(
                UserRoadmapProgress.user_id == current_user.id,
                UserRoadmapProgress.is_completed == True
            )
            .group_by(UserRoadmapProgress.roadmap_id)
            .all()
        )

    for rm in roadmaps:
        total = len(rm.steps)
        completed = completed_counts.get(rm.id, 0) if current_user else 0

        percentage = round((completed / total * 100), 1) if total > 0 else 0.0
        results.append(RoadmapResponse(
            id=rm.id,
            title=rm.title,
            slug=rm.slug,
            description=rm.description,
            level=rm.level,
            category=rm.category,
            creator=rm.creator,
            total_steps=total,
            completed_steps=completed,
            progress_percentage=percentage,
            created_at=rm.created_at
        ))

    return results


@router.get("/{id_or_slug}", response_model=RoadmapDetailResponse)
def get_roadmap_detail(
    id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get roadmap details with ordered steps and current user progress per step.
    """
    if id_or_slug.isdigit():
        roadmap = db.query(Roadmap).filter(Roadmap.id == int(id_or_slug)).first()
    else:
        roadmap = db.query(Roadmap).filter(Roadmap.slug == id_or_slug).first()

    if not roadmap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lộ trình không tồn tại")

    completed_step_ids = set()
    if current_user:
        progs = db.query(UserRoadmapProgress.step_id).filter(
            UserRoadmapProgress.user_id == current_user.id,
            UserRoadmapProgress.roadmap_id == roadmap.id,
            UserRoadmapProgress.is_completed == True
        ).all()
        completed_step_ids = {p[0] for p in progs}

    steps_res = []
    for step in roadmap.steps:
        steps_res.append(RoadmapStepResponse(
            id=step.id,
            roadmap_id=step.roadmap_id,
            order_index=step.order_index,
            title=step.title,
            description=step.description,
            post_id=step.post_id,
            resource_url=step.resource_url,
            is_completed=step.id in completed_step_ids
        ))

    total = len(steps_res)
    completed = len(completed_step_ids)
    percentage = round((completed / total * 100), 1) if total > 0 else 0.0

    return RoadmapDetailResponse(
        id=roadmap.id,
        title=roadmap.title,
        slug=roadmap.slug,
        description=roadmap.description,
        level=roadmap.level,
        category=roadmap.category,
        creator=roadmap.creator,
        steps=steps_res,
        total_steps=total,
        completed_steps=completed,
        progress_percentage=percentage,
        created_at=roadmap.created_at
    )


@router.post("", response_model=RoadmapDetailResponse, status_code=status.HTTP_201_CREATED)
def create_roadmap(
    data: RoadmapCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new structured learning roadmap with steps.
    """
    clean_title = data.title.strip() if data.title else ""
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiêu đề lộ trình không được để trống."
        )

    clean_desc = data.description.strip() if data.description else ""
    if not clean_desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mô tả lộ trình không được để trống."
        )

    base_slug = slugify(clean_title) or "lo-trinh"
    slug = base_slug
    counter = 1
    while db.query(Roadmap).filter(Roadmap.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    clean_level = data.level.lower().strip() if data.level else "basic"
    if clean_level not in {"basic", "intermediate", "advanced"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cấp độ lộ trình không hợp lệ. Cho phép: basic, intermediate, advanced."
        )

    if data.category_id:
        existing_cat = db.query(Category).filter(Category.id == data.category_id).first()
        if not existing_cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chuyên mục được chỉ định không tồn tại."
            )

    if data.steps:
        for idx, s in enumerate(data.steps):
            clean_step_title = s.title.strip() if s.title else ""
            if not clean_step_title:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tiêu đề bước học thứ {idx + 1} không được để trống."
                )

    roadmap = Roadmap(
        title=clean_title,
        slug=slug,
        description=clean_desc,
        level=clean_level,
        category_id=data.category_id,
        created_by_id=current_user.id
    )
    db.add(roadmap)
    db.flush()

    if data.steps:
        for idx, s in enumerate(data.steps):
            step_post_id = s.post_id
            if step_post_id and not db.query(Post.id).filter(Post.id == step_post_id).first():
                step_post_id = None
            step = RoadmapStep(
                roadmap_id=roadmap.id,
                order_index=s.order_index if s.order_index is not None else idx,
                title=s.title.strip(),
                description=s.description,
                post_id=step_post_id,
                resource_url=s.resource_url
            )
            db.add(step)

    db.commit()
    db.refresh(roadmap)

    steps_res = [
        RoadmapStepResponse(
            id=step.id,
            roadmap_id=step.roadmap_id,
            order_index=step.order_index,
            title=step.title,
            description=step.description,
            post_id=step.post_id,
            resource_url=step.resource_url,
            is_completed=False
        )
        for step in roadmap.steps
    ]

    return RoadmapDetailResponse(
        id=roadmap.id,
        title=roadmap.title,
        slug=roadmap.slug,
        description=roadmap.description,
        level=roadmap.level,
        category=roadmap.category,
        creator=roadmap.creator,
        steps=steps_res,
        total_steps=len(steps_res),
        completed_steps=0,
        progress_percentage=0.0,
        created_at=roadmap.created_at
    )


@router.post("/{id}/steps/{step_id}/toggle", response_model=StepToggleResponse)
def toggle_step_completion(
    id: int,
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Toggle completed status of a roadmap step for current user.
    """
    step = db.query(RoadmapStep).filter(
        RoadmapStep.id == step_id,
        RoadmapStep.roadmap_id == id
    ).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bước học không tồn tại")

    progress = db.query(UserRoadmapProgress).filter(
        UserRoadmapProgress.user_id == current_user.id,
        UserRoadmapProgress.step_id == step_id
    ).first()

    if progress:
        progress.is_completed = not progress.is_completed
        progress.completed_at = datetime.now(timezone.utc) if progress.is_completed else None
        new_status = progress.is_completed
    else:
        progress = UserRoadmapProgress(
            user_id=current_user.id,
            roadmap_id=id,
            step_id=step_id,
            is_completed=True,
            completed_at=datetime.now(timezone.utc)
        )
        db.add(progress)
        new_status = True

    db.commit()

    # Recalculate roadmap stats
    total = db.query(RoadmapStep).filter(RoadmapStep.roadmap_id == id).count()
    completed = db.query(UserRoadmapProgress).filter(
        UserRoadmapProgress.user_id == current_user.id,
        UserRoadmapProgress.roadmap_id == id,
        UserRoadmapProgress.is_completed == True
    ).count()
    percentage = round((completed / total * 100), 1) if total > 0 else 0.0

    return StepToggleResponse(
        step_id=step_id,
        is_completed=new_status,
        completed_steps=completed,
        total_steps=total,
        progress_percentage=percentage
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_roadmap(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a roadmap and its steps. Creator or admin/moderator can delete.
    """
    roadmap = db.query(Roadmap).filter(Roadmap.id == id).first()
    if not roadmap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lộ trình không tồn tại.")

    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if roadmap.created_by_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa lộ trình này.")

    db.query(UserRoadmapProgress).filter(UserRoadmapProgress.roadmap_id == id).delete(synchronize_session=False)
    db.delete(roadmap)
    db.commit()
    return None

