from typing import List, Dict, Any
from pydantic import BaseModel


class PlatformAnalyticsOverview(BaseModel):
    total_posts: int
    total_users: int
    total_views: int
    total_interactions: int
    top_trending_tags: List[Dict[str, Any]] = []
    daily_views_history: List[Dict[str, Any]] = []


class PostAnalyticsDetail(BaseModel):
    post_id: int
    title: str
    views: int
    likes_count: int
    bookmarks_count: int
    comments_count: int
    avg_read_time_seconds: int
    estimated_completion_rate: float
