from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content: str = ""
    video_url: Optional[str] = None
    duration_minutes: int = 15
    order_index: int = 0


class LessonResponse(BaseModel):
    id: int
    course_id: int
    title: str
    slug: str
    description: Optional[str] = None
    content: str
    video_url: Optional[str] = None
    duration_minutes: int
    order_index: int
    is_completed: bool = False

    model_config = ConfigDict(from_attributes=True)


class CourseCreate(BaseModel):
    title: str
    description: str
    category_id: Optional[int] = None
    level: str = "beginner"
    cover_image: Optional[str] = None
    lessons: Optional[List[LessonCreate]] = []


class CourseResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    level: str
    cover_image: Optional[str] = None
    instructor_name: Optional[str] = None
    category_name: Optional[str] = None
    total_lessons: int = 0
    enrolled_students: int = 0
    user_progress_percent: float = 0.0
    is_enrolled: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseDetailResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    level: str
    cover_image: Optional[str] = None
    instructor_name: Optional[str] = None
    category_name: Optional[str] = None
    lessons: List[LessonResponse] = []
    total_lessons: int = 0
    completed_lessons: int = 0
    user_progress_percent: float = 0.0
    is_enrolled: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EnrollmentResponse(BaseModel):
    course_id: int
    status: str
    enrolled_at: datetime


class LessonProgressToggle(BaseModel):
    lesson_id: int
    is_completed: bool
    completed_lessons: int
    total_lessons: int
    progress_percent: float
