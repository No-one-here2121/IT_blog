from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.models.base import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(280), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(String(50), default="basic", index=True)  # basic, intermediate, advanced
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

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
    category = relationship("Category")
    creator = relationship("User")
    steps: Mapped[List["RoadmapStep"]] = relationship(
        "RoadmapStep",
        back_populates="roadmap",
        cascade="all, delete-orphan",
        order_by="RoadmapStep.order_index"
    )


class RoadmapStep(Base):
    __tablename__ = "roadmap_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    roadmap_id: Mapped[int] = mapped_column(ForeignKey("roadmaps.id", ondelete="CASCADE"), index=True, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    post_id: Mapped[Optional[int]] = mapped_column(ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    resource_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    roadmap = relationship("Roadmap", back_populates="steps")
    post = relationship("Post")


class UserRoadmapProgress(Base):
    __tablename__ = "user_roadmap_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "step_id", name="uq_user_roadmap_step"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    roadmap_id: Mapped[int] = mapped_column(ForeignKey("roadmaps.id", ondelete="CASCADE"), index=True, nullable=False)
    step_id: Mapped[int] = mapped_column(ForeignKey("roadmap_steps.id", ondelete="CASCADE"), index=True, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User")
    roadmap = relationship("Roadmap")
    step = relationship("RoadmapStep")
