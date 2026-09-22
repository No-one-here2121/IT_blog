from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CrawlSourceCreate(BaseModel):
    name: str
    url: str
    source_type: Optional[str] = "rss"
    category_id: Optional[int] = None


class CrawlSourceResponse(BaseModel):
    id: int
    name: str
    url: str
    source_type: str
    is_active: bool
    category_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TriggerCrawlRequest(BaseModel):
    source_id: Optional[int] = None
    auto_publish: Optional[bool] = False


class CrawlJobResponse(BaseModel):
    id: int
    source_id: Optional[int] = None
    status: str
    items_crawled: int
    items_saved: int
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CrawlResultResponse(BaseModel):
    job: CrawlJobResponse
    crawled_posts: List[dict] = []
