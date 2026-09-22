from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BehaviorEventCreate(BaseModel):
    event_type: str  # view, read_30s, like, bookmark, click_tag, search
    post_id: Optional[int] = None
    category_id: Optional[int] = None
    tag_id: Optional[int] = None
    metadata_json: Optional[str] = None


class BehaviorEventResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    event_type: str
    post_id: Optional[int] = None
    category_id: Optional[int] = None
    tag_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendedAuthorResponse(BaseModel):
    user_id: int
    username: str
    name: str
    avatar: Optional[str] = None
    affinity_score: float
    reason: str


class RecommendedTopicResponse(BaseModel):
    category_id: Optional[int] = None
    category_name: str
    post_count: int
    interest_score: float
