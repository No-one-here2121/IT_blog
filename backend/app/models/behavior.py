from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.models.base import Base


class UserBehaviorEvent(Base):
    __tablename__ = "user_behavior_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # view, read_30s, like, bookmark, click_tag, search
    post_id: Mapped[Optional[int]] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True, nullable=True)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), index=True, nullable=True)
    tag_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tags.id", ondelete="SET NULL"), index=True, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    # Relationships
    user = relationship("User")
    post = relationship("Post")
    category = relationship("Category")
    tag = relationship("Tag")
