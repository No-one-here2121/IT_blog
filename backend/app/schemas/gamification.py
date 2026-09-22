from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class BadgeResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str
    icon: str
    points_required: int

    model_config = ConfigDict(from_attributes=True)


class UserBadgeResponse(BaseModel):
    id: int
    badge: BadgeResponse
    awarded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReputationLogResponse(BaseModel):
    id: int
    points: int
    action: str
    reference_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaderboardUserResponse(BaseModel):
    rank: int
    user_id: int
    username: str
    name: str
    avatar: Optional[str] = None
    reputation_points: int
    badges_count: int
    posts_count: int


class UserReputationStats(BaseModel):
    user_id: int
    username: str
    name: str
    avatar: Optional[str] = None
    total_points: int
    rank: int
    badges: List[BadgeResponse] = []
    recent_logs: List[ReputationLogResponse] = []
