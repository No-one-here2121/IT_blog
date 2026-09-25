from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


# Shared Properties
class UserBase(BaseModel):
    email: EmailStr
    username: str
    name: str
    avatar: Optional[str] = None
    bio: Optional[str] = None


# Schema for User Registration
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    name: str
    password: str


# Schema for User Login
class UserLogin(BaseModel):
    identifier: str  # Email or username
    password: str


# Schema for Updating User Profile
class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None


# Schema for Role response
class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Schema for User in DB / Private Profile
class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    roles: List[RoleResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Schema for Public Profile (Email excluded for user privacy)
class UserPublicResponse(BaseModel):
    id: int
    username: str
    name: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    created_at: datetime
    roles: List[RoleResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Author Summary (used inside Post responses)
class AuthorSummary(BaseModel):
    id: int
    username: str
    name: str
    avatar: Optional[str] = None
    bio: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Token Schemas
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MessageResponse(BaseModel):
    message: str
    success: bool = True
    reset_token: Optional[str] = None


class OAuthLoginRequest(BaseModel):
    provider: str  # google | github | facebook
    token: Optional[str] = None
    code: Optional[str] = None
    redirect_uri: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar: Optional[str] = None
    provider_user_id: Optional[str] = None


class OAuthAuthorizeResponse(BaseModel):
    provider: str
    authorize_url: str
    is_configured: bool
    client_id: Optional[str] = None


# Real Developer Activity & Streak Schemas
class ReadHistoryItem(BaseModel):
    id: int
    title: str
    category: str
    cover_image: Optional[str] = None
    read_time: str
    read_at: str

    model_config = ConfigDict(from_attributes=True)


class DayContributionItem(BaseModel):
    date: str
    display_date: str
    count: int
    level: int
    day_of_week: int


class UserActivityResponse(BaseModel):
    user_id: int
    username: str
    total_contributions: int
    current_streak: int
    max_streak: int
    reading_streak: int
    heatmap_weeks: List[List[DayContributionItem]]
    reading_history: List[ReadHistoryItem] = []
