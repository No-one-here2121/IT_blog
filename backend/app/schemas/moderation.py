from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, ConfigDict
from app.schemas.user import AuthorSummary


class ReportCreate(BaseModel):
    target_type: str
    target_id: Union[int, str]
    reason: str
    details: Optional[str] = None


class ReportResponse(BaseModel):
    id: int
    reporter: AuthorSummary
    target_type: str
    target_id: int
    reason: str
    details: Optional[str] = None
    status: str
    resolved_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportResolve(BaseModel):
    status: str
    action: Optional[str] = None


class BugReportCreate(BaseModel):
    category: Optional[str] = "bug"
    priority: Optional[str] = "medium"
    title: str
    description: str
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None


class BugReportUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    priority: Optional[str] = None


class BugReportResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    reporter: Optional[AuthorSummary] = None
    category: str
    priority: str
    title: str
    description: str
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    resolved_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    id: int
    user: Optional[AuthorSummary] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminStatsResponse(BaseModel):
    total_users: int
    total_posts: int
    total_comments: int
    total_views: int
    pending_posts_count: int
    pending_reports_count: int
    pending_bugs_count: Optional[int] = 0


class AdminUserResponse(BaseModel):
    id: int
    username: str
    name: str
    email: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    is_superuser: bool
    roles: List[str] = []
    posts_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserRoleUpdate(BaseModel):
    role: str


class AdminUserStatusUpdate(BaseModel):
    is_active: bool
