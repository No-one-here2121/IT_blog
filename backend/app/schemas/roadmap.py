from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import AuthorSummary
from app.schemas.category import CategoryResponse


class RoadmapStepCreate(BaseModel):
    order_index: int = 0
    title: str
    description: Optional[str] = None
    post_id: Optional[int] = None
    resource_url: Optional[str] = None


class RoadmapStepResponse(BaseModel):
    id: int
    roadmap_id: int
    order_index: int
    title: str
    description: Optional[str] = None
    post_id: Optional[int] = None
    resource_url: Optional[str] = None
    is_completed: bool = False

    model_config = ConfigDict(from_attributes=True)


class RoadmapCreate(BaseModel):
    title: str
    description: str
    level: str = "basic"  # basic, intermediate, advanced
    category_id: Optional[int] = None
    steps: Optional[List[RoadmapStepCreate]] = []


class RoadmapResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    level: str
    category: Optional[CategoryResponse] = None
    creator: Optional[AuthorSummary] = None
    total_steps: int = 0
    completed_steps: int = 0
    progress_percentage: float = 0.0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoadmapDetailResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    level: str
    category: Optional[CategoryResponse] = None
    creator: Optional[AuthorSummary] = None
    steps: List[RoadmapStepResponse] = []
    total_steps: int = 0
    completed_steps: int = 0
    progress_percentage: float = 0.0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StepToggleResponse(BaseModel):
    step_id: int
    is_completed: bool
    completed_steps: int
    total_steps: int
    progress_percentage: float
