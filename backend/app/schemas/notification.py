from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import AuthorSummary


class NotificationResponse(BaseModel):
    id: int
    recipient_id: int
    sender: Optional[AuthorSummary] = None
    type: str
    entity_id: Optional[int] = None
    entity_type: Optional[str] = None
    content: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
