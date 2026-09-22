from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.core.database import get_db
from app.models.tag import Tag
from app.models.post import Post, PostTag, PostStatus
from app.schemas.tag import TagResponse

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("", response_model=List[TagResponse])
def get_tags(db: Session = Depends(get_db)):
    """
    Get all tags with approved post count, sorted by popularity.
    """
    now = datetime.now(timezone.utc)
    tag_counts = (
        db.query(PostTag.tag_id, func.count(PostTag.post_id).label("count"))
        .join(Post, Post.id == PostTag.post_id)
        .filter(
            Post.status == PostStatus.APPROVED.value,
            or_(Post.scheduled_at == None, Post.scheduled_at <= now)
        )
        .group_by(PostTag.tag_id)
        .all()
    )
    count_dict = {tag_id: c for tag_id, c in tag_counts}

    tags = db.query(Tag).all()
    results = []
    for tag in tags:
        resp = TagResponse.model_validate(tag)
        resp.post_count = count_dict.get(tag.id, 0)
        results.append(resp)

    # Sort tags by post_count descending
    results.sort(key=lambda t: (t.post_count or 0), reverse=True)
    return results
