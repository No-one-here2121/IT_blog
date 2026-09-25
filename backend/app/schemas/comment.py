from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, ConfigDict
from app.schemas.user import AuthorSummary


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[Union[int, str]] = None


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    post_id: int
    author: AuthorSummary
    parent_id: Optional[Union[int, str]] = None
    content: str
    is_edited: bool
    is_accepted_answer: bool = False
    is_pinned: bool = False
    likes_count: int = 0
    is_liked: bool = False
    replies: List["CommentResponse"] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
