from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import AuthorSummary
from app.schemas.post import PostListItem


class LikeResponse(BaseModel):
    is_liked: bool
    likes_count: int


class BookmarkResponse(BaseModel):
    is_bookmarked: bool


class FollowResponse(BaseModel):
    is_following: bool
    followers_count: int


class FollowerListResponse(BaseModel):
    items: List[AuthorSummary]
    total: int


class BookmarkedPostsResponse(BaseModel):
    items: List[PostListItem]
    total: int
