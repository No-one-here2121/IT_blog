from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import AuthorSummary
from app.schemas.category import CategoryResponse
from app.schemas.tag import TagResponse


class PostBase(BaseModel):
    title: str
    excerpt: Optional[str] = None
    content: str
    cover_image: Optional[str] = None
    status: Optional[str] = "approved"
    tech_stack_version: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class PostCreate(PostBase):
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    tags: Optional[List[str]] = []


class PostUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    cover_image: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    tech_stack_version: Optional[str] = None
    is_deprecated: Optional[bool] = None
    deprecated_warning: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    change_summary: Optional[str] = None



class PostVerifyRequest(BaseModel):
    is_verified: bool = True
    verification_notes: Optional[str] = None
    tech_stack_version: Optional[str] = None
    is_deprecated: bool = False
    deprecated_warning: Optional[str] = None


class PostResponse(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    cover_image: Optional[str] = None
    status: str
    views: int
    read_time: str
    author: AuthorSummary
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = []
    is_verified: bool = False
    verification_notes: Optional[str] = None
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    tech_stack_version: Optional[str] = None
    is_deprecated: bool = False
    deprecated_warning: Optional[str] = None
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    shares_count: int = 0
    likes_count: int = 0
    comments_count: int = 0
    bookmarks_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostListItem(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    status: str
    views: int
    shares_count: int = 0
    likes_count: int = 0
    comments_count: int = 0
    bookmarks_count: int = 0
    read_time: str
    author: AuthorSummary
    category: Optional[CategoryResponse] = None
    tags: List[TagResponse] = []
    is_verified: bool = False
    tech_stack_version: Optional[str] = None
    is_deprecated: bool = False
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedPostResponse(BaseModel):
    items: List[PostListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class RelatedVideo(BaseModel):
    id: str
    title: str
    channel: str
    duration: str
    thumbnail: str
    url: str
    views: str
    category: str


class PostRevisionResponse(BaseModel):
    id: int
    post_id: int
    title: str
    excerpt: Optional[str] = None
    content: str
    change_summary: Optional[str] = None
    edited_by_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostShareResponse(BaseModel):
    post_id: int
    shares_count: int
    share_url: str
    message: str


