from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from slugify import slugify

from app.core.database import get_db
from app.models.user import User
from app.models.company_job import Company, JobPost, JobApplication
from app.schemas.job import (
    CompanyCreate,
    CompanyResponse,
    CompanyDetailResponse,
    JobPostCreate,
    JobPostResponse,
    JobApplicationCreate,
    JobApplicationResponse
)
from app.api.deps import get_current_active_user


router = APIRouter(tags=["Jobs & Companies"])


@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(db: Session = Depends(get_db)):
    """
    Get list of registered tech companies.
    """
    return db.query(Company).order_by(Company.name.asc()).all()


@router.get("/companies/{id_or_slug}", response_model=CompanyDetailResponse)
def get_company_detail(id_or_slug: str, db: Session = Depends(get_db)):
    """
    Section 45: Get detailed Company Profile with active job postings.
    """
    if id_or_slug.isdigit():
        company = db.query(Company).filter(Company.id == int(id_or_slug)).first()
    else:
        company = db.query(Company).filter(Company.slug == id_or_slug).first()

    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hồ sơ công ty không tồn tại.")

    active_jobs = (
        db.query(JobPost)
        .filter(JobPost.company_id == company.id, JobPost.status == "active")
        .order_by(JobPost.created_at.desc())
        .all()
    )

    return CompanyDetailResponse(
        id=company.id,
        name=company.name,
        slug=company.slug,
        website=company.website,
        logo=company.logo,
        description=company.description,
        location=company.location,
        tech_stack=company.tech_stack,
        created_at=company.created_at,
        jobs=[j for j in active_jobs]
    )


@router.post("/companies/{id}/follow")
def follow_company(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Section 45: Follow/unfollow employer profile to receive new job updates.
    """
    company = db.query(Company).filter(Company.id == id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Công ty không tồn tại.")
    return {
        "message": f"Đã cập nhật theo dõi doanh nghiệp {company.name}.",
        "company_id": company.id,
        "is_following": True
    }


@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
@router.post("/jobs/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Register a new tech company profile.
    """
    clean_name = data.name.strip() if data.name else ""
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên công ty không được để trống."
        )

    base_slug = slugify(clean_name) or "cong-ty"
    slug = base_slug
    counter = 1
    while db.query(Company).filter(Company.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    company = Company(
        name=clean_name,
        slug=slug,
        website=data.website,
        logo=data.logo,
        description=data.description,
        location=data.location,
        tech_stack=data.tech_stack
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/jobs", response_model=List[JobPostResponse])
def get_jobs(
    skill: Optional[str] = None,
    location: Optional[str] = None,
    work_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Search and filter IT job postings.
    """
    query = db.query(JobPost).filter(JobPost.status == "active")

    if skill:
        query = query.filter(JobPost.skills.ilike(f"%{skill}%"))
    if location:
        query = query.filter(JobPost.location.ilike(f"%{location}%"))
    if work_type:
        query = query.filter(JobPost.work_type == work_type.lower())
    if search:
        query = query.filter(
            or_(
                JobPost.title.ilike(f"%{search}%"),
                JobPost.description.ilike(f"%{search}%"),
                JobPost.skills.ilike(f"%{search}%")
            )
        )

    return query.order_by(JobPost.created_at.desc()).all()


@router.get("/jobs/applications/me", response_model=List[JobApplicationResponse])
def get_my_job_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    View my submitted job applications (Section 29).
    """
    applications = db.query(JobApplication).filter(JobApplication.user_id == current_user.id).order_by(JobApplication.created_at.desc()).all()
    results = []
    for app_item in applications:
        job = app_item.job_post
        results.append(JobApplicationResponse(
            id=app_item.id,
            job_post_id=app_item.job_post_id,
            user_id=app_item.user_id,
            full_name=app_item.full_name,
            email=app_item.email,
            phone=app_item.phone,
            resume_url=app_item.resume_url,
            cover_letter=app_item.cover_letter,
            status=app_item.status,
            created_at=app_item.created_at,
            job_title=job.title if job else None,
            company_name=job.company.name if job and job.company else None
        ))
    return results


@router.get("/jobs/{id}", response_model=JobPostResponse)
def get_job_detail(id: int, db: Session = Depends(get_db)):
    """
    Get detailed IT job opportunity.
    """
    job = db.query(JobPost).filter(JobPost.id == id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tin tuyển dụng không tồn tại")
    return job


@router.post("/jobs", response_model=JobPostResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    data: JobPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Post an IT job vacancy.
    """
    clean_title = data.title.strip() if data.title else ""
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiêu đề tin tuyển dụng không được để trống."
        )

    clean_desc = data.description.strip() if data.description else ""
    if not clean_desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mô tả công việc không được để trống."
        )

    clean_loc = data.location.strip() if data.location else ""
    if not clean_loc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Địa điểm làm việc không được để trống."
        )

    company_id = data.company_id
    if company_id:
        comp = db.query(Company).filter(Company.id == company_id).first()
        if not comp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Công ty được chỉ định không tồn tại."
            )
    else:
        clean_comp_name = data.company_name.strip() if data.company_name else ""
        if not clean_comp_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vui lòng cung cấp tên công ty hoặc ID công ty.")
        
        # Check if company exists by name
        comp = db.query(Company).filter(func.lower(Company.name) == clean_comp_name.lower()).first()
        if not comp:
            base_slug = slugify(clean_comp_name) or "cong-ty"
            comp_slug = base_slug
            counter = 1
            while db.query(Company).filter(Company.slug == comp_slug).first():
                comp_slug = f"{base_slug}-{counter}"
                counter += 1
            comp = Company(
                name=clean_comp_name,
                slug=comp_slug,
                location=clean_loc
            )
            db.add(comp)
            db.flush()
        company_id = comp.id

    job = JobPost(
        company_id=company_id,
        title=clean_title,
        location=clean_loc,
        work_type=data.work_type,
        salary_range=data.salary_range,
        description=clean_desc,
        requirements=data.requirements,
        skills=data.skills,
        application_url=data.application_url,
        status="active"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{id}/apply", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_for_job(
    id: int,
    data: JobApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Apply for an IT job posting (Sections 29 & 33).
    """
    job = db.query(JobPost).filter(JobPost.id == id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tin tuyển dụng không tồn tại."
        )

    if job.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tin tuyển dụng này đã đóng hoặc tạm dừng nhận hồ sơ."
        )

    # Check if already applied
    existing = db.query(JobApplication).filter(
        JobApplication.job_post_id == id,
        JobApplication.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã nộp hồ sơ ứng tuyển vào vị trí này rồi."
        )

    clean_name = data.full_name.strip() if data.full_name else (current_user.name.strip() if current_user.name else "")
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Họ và tên người ứng tuyển không được để trống."
        )

    clean_email = data.email.strip() if data.email else (current_user.email.strip() if current_user.email else "")
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email liên hệ không được để trống."
        )

    application = JobApplication(
        job_post_id=id,
        user_id=current_user.id,
        full_name=clean_name,
        email=clean_email,
        phone=data.phone,
        resume_url=data.resume_url,
        cover_letter=data.cover_letter,
        status="pending"
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return JobApplicationResponse(
        id=application.id,
        job_post_id=application.job_post_id,
        user_id=application.user_id,
        full_name=application.full_name,
        email=application.email,
        phone=application.phone,
        resume_url=application.resume_url,
        cover_letter=application.cover_letter,
        status=application.status,
        created_at=application.created_at,
        job_title=job.title,
        company_name=job.company.name if job.company else None
    )


@router.get("/jobs/{id}/applications", response_model=List[JobApplicationResponse])
def get_job_applications(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    View applications for a specific job post. Admin / Employer access.
    """
    job = db.query(JobPost).filter(JobPost.id == id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tin tuyển dụng không tồn tại.")

    applications = db.query(JobApplication).filter(JobApplication.job_post_id == id).order_by(JobApplication.created_at.desc()).all()
    results = []
    for app_item in applications:
        results.append(JobApplicationResponse(
            id=app_item.id,
            job_post_id=app_item.job_post_id,
            user_id=app_item.user_id,
            full_name=app_item.full_name,
            email=app_item.email,
            phone=app_item.phone,
            resume_url=app_item.resume_url,
            cover_letter=app_item.cover_letter,
            status=app_item.status,
            created_at=app_item.created_at,
            job_title=job.title,
            company_name=job.company.name if job.company else None
        ))
    return results


@router.delete("/jobs/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an IT job post (Admin, Moderator, or Employer).
    """
    job = db.query(JobPost).filter(JobPost.id == id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tin tuyển dụng không tồn tại.")

    db.query(JobApplication).filter(JobApplication.job_post_id == id).delete(synchronize_session=False)
    db.delete(job)
    db.commit()
    return None

