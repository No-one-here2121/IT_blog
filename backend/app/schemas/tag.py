from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TagBase(BaseModel):
    name: str


class TagCreate(TagBase):
    slug: Optional[str] = None


class TagResponse(TagBase):
    id: int
    slug: str
    created_at: datetime
    post_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
