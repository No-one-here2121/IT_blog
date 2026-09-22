from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None


class CategoryCreate(CategoryBase):
    slug: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: int
    slug: str
    created_at: datetime
    post_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
