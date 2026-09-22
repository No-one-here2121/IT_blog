from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CompanyCreate(BaseModel):
    name: str
    website: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    tech_stack: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    slug: str
    website: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    tech_stack: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyJobSummary(BaseModel):
    id: int
    title: str
    location: str
    work_type: str
    salary_range: str
    skills: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyDetailResponse(BaseModel):
    id: int
    name: str
    slug: str
    website: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    tech_stack: Optional[str] = None
    created_at: datetime
    jobs: List[CompanyJobSummary] = []

    model_config = ConfigDict(from_attributes=True)


class JobPostCreate(BaseModel):
    company_id: Optional[int] = None
    company_name: Optional[str] = None  # Auto create if not exist
    title: str
    location: str
    work_type: str = "full-time"
    salary_range: str = "Thương lượng"
    description: str
    requirements: Optional[str] = None
    skills: Optional[str] = None
    application_url: Optional[str] = None


class JobPostResponse(BaseModel):
    id: int
    company: CompanyResponse
    title: str
    location: str
    work_type: str
    salary_range: str
    description: str
    requirements: Optional[str] = None
    skills: Optional[str] = None
    application_url: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobApplicationCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None


class JobApplicationResponse(BaseModel):
    id: int
    job_post_id: int
    user_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None
    status: str
    created_at: datetime
    job_title: Optional[str] = None
    company_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

