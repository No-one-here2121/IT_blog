from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, Any
from app.models.base import Base


class QuizQuestionPost(Base):
    __tablename__ = "quiz_question_posts"

    question_id: Mapped[int] = mapped_column(
        ForeignKey("quiz_questions.id", ondelete="CASCADE"),
        primary_key=True
    )
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    language: Mapped[str] = mapped_column(String(50), default="", index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[Any] = mapped_column(JSON, nullable=False)  # List[str] of 4 options
    answer_index: Mapped[int] = mapped_column(Integer, default=0)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="")
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", index=True)  # easy, medium, hard
    source: Mapped[str] = mapped_column(String(20), default="manual")  # manual, ai
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    # Relationships
    course = relationship("Course")
    creator = relationship("User")
    posts: Mapped[List["Post"]] = relationship(
        "Post",
        secondary="quiz_question_posts",
        backref="quiz_questions"
    )
