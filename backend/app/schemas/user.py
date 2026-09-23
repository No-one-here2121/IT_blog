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


# Schema for User in DB / Public Profile
class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
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
