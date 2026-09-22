from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.models.base import Base


class PostStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PostTag(Base):
    __tablename__ = "post_tags"

    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(280), unique=True, index=True, nullable=False)
    excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    cover_image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=PostStatus.APPROVED.value, index=True)
    views: Mapped[int] = mapped_column(Integer, default=0)
    shares_count: Mapped[int] = mapped_column(Integer, default=0)
    read_time: Mapped[str] = mapped_column(String(50), default="5 phút đọc")
    
    # Verification Center & Technology Version Tracking (Sections 40 & 41)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    tech_stack_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_deprecated: Mapped[bool] = mapped_column(Boolean, default=False)
    deprecated_warning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Foreign Keys
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), index=True, nullable=True)

    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id], back_populates="posts", lazy="joined")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="posts", lazy="joined")
    tags: Mapped[List["Tag"]] = relationship(
        "Tag",
        secondary="post_tags",
        back_populates="posts",
        lazy="joined"
    )
    revisions: Mapped[List["PostRevision"]] = relationship(
        "PostRevision",
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="desc(PostRevision.created_at)"
    )

    @property
    def likes_count(self) -> int:
        return len(self.likes) if hasattr(self, "likes") and self.likes else 0

    @property
    def comments_count(self) -> int:
        return len(self.comments) if hasattr(self, "comments") and self.comments else 0

    @property
    def bookmarks_count(self) -> int:
        return len(self.bookmarked_by) if hasattr(self, "bookmarked_by") and self.bookmarked_by else 0



class PostRevision(Base):
    __tablename__ = "post_revisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    change_summary: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    edited_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    post: Mapped["Post"] = relationship("Post", back_populates="revisions")
    editor = relationship("User", foreign_keys=[edited_by_id])

