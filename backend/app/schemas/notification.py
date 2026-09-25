from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, model_validator
from app.schemas.user import AuthorSummary


class NotificationResponse(BaseModel):
    id: int
    recipient_id: int
    sender: Optional[AuthorSummary] = None
    type: str
    entity_id: Optional[int] = None
    entity_type: Optional[str] = None
    post_id: Optional[int] = None
    title: Optional[str] = None
    content: str
    message: Optional[str] = None
    is_read: bool
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def populate_helpers(cls, data):
        title_map = {
            "comment": "Bình luận mới",
            "like": "Lượt thích mới",
            "system": "Thông báo hệ thống",
            "post": "Bài viết mới",
            "reply": "Phản hồi bình luận",
            "follow": "Người theo dõi mới"
        }
        if hasattr(data, "__dict__"):
            entity_id = getattr(data, "entity_id", None)
            entity_type = getattr(data, "entity_type", None)
            content = getattr(data, "content", "")
            notif_type = str(getattr(data, "type", "system"))
            title = title_map.get(notif_type.lower(), "Thông báo")
            post_id = getattr(data, "post_id", None)
            if not post_id and entity_type in ["post", "comment", "reply"]:
                post_id = entity_id
            return {
                "id": data.id,
                "recipient_id": data.recipient_id,
                "sender": getattr(data, "sender", None),
                "type": notif_type,
                "entity_id": entity_id,
                "entity_type": entity_type,
                "post_id": post_id or entity_id,
                "title": title,
                "content": content,
                "message": content,
                "is_read": data.is_read,
                "created_at": data.created_at
            }
        elif isinstance(data, dict):
            if "message" not in data and "content" in data:
                data["message"] = data["content"]
            if "post_id" not in data and data.get("entity_type") == "post":
                data["post_id"] = data.get("entity_id")
            if "title" not in data:
                notif_type = str(data.get("type", "system")).lower()
                data["title"] = title_map.get(notif_type, "Thông báo")
        return data

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
