from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from slugify import slugify

from app.core.database import get_db
from app.models.user import User
from app.models.category import Category
from app.models.course import Course, CourseLesson, CourseEnrollment, CourseLessonProgress
from app.models.quiz import QuizQuestion
from app.schemas.course import (
    CourseCreate,
    CourseResponse,
    CourseDetailResponse,
    LessonResponse,
    EnrollmentResponse,
    LessonProgressToggle
)
from app.api.deps import get_current_active_user, get_current_user_optional

router = APIRouter(prefix="/courses", tags=["Learning Hub & Courses"])


@router.get("", response_model=List[CourseResponse])
def get_courses(
    level: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    List courses in Learning Hub with enrollment status and completion progress.
    """
    query = db.query(Course).filter(Course.status == "published")
    if level:
        query = query.filter(Course.level == level.lower())
    if category_id:
        query = query.filter(Course.category_id == category_id)

    courses = query.order_by(Course.created_at.desc()).all()
    results = []

    # Pre-fetch enrollment counts across all courses
    enrolled_counts = dict(
        db.query(CourseEnrollment.course_id, func.count(CourseEnrollment.id))
        .group_by(CourseEnrollment.course_id)
        .all()
    )

    # Pre-fetch current user enrollment & progress in a single batch
    user_enrolled_courses = set()
    user_completed_counts = {}
    if current_user:
        user_enrolled_courses = {
            r[0] for r in
            db.query(CourseEnrollment.course_id)
            .filter(CourseEnrollment.user_id == current_user.id)
            .all()
        }
        user_completed_counts = dict(
            db.query(CourseLessonProgress.course_id, func.count(CourseLessonProgress.id))
            .filter(
                CourseLessonProgress.user_id == current_user.id,
                CourseLessonProgress.is_completed == True
            )
            .group_by(CourseLessonProgress.course_id)
            .all()
        )

    for c in courses:
        total_lessons = len(c.lessons)
        enrolled_count = enrolled_counts.get(c.id, 0)
        is_enrolled = c.id in user_enrolled_courses
        completed_count = user_completed_counts.get(c.id, 0) if is_enrolled else 0
        progress_pct = round((completed_count / total_lessons * 100), 1) if (is_enrolled and total_lessons > 0) else 0.0

        results.append(CourseResponse(
            id=c.id,
            title=c.title,
            slug=c.slug,
            description=c.description,
            level=c.level,
            cover_image=c.cover_image,
            instructor_name=c.instructor.name if c.instructor else "Giảng viên IT Blog",
            category_name=c.category.name if c.category else "Chung",
            total_lessons=total_lessons,
            enrolled_students=enrolled_count,
            user_progress_percent=progress_pct,
            is_enrolled=is_enrolled,
            created_at=c.created_at
        ))

    return results


@router.get("/{id_or_slug}", response_model=CourseDetailResponse)
def get_course_detail(
    id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get course details with lessons syllabus and student progress.
    """
    if id_or_slug.isdigit():
        course = db.query(Course).filter(Course.id == int(id_or_slug)).first()
    else:
        course = db.query(Course).filter(Course.slug == id_or_slug).first()

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại")

    is_privileged = current_user and (
        current_user.id == course.instructor_id or
        current_user.is_superuser or
        any(r.name in ["admin", "moderator"] for r in current_user.roles)
    )
    if course.status != "published" and not is_privileged:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại")

    completed_lesson_ids = set()
    is_enrolled = False
    if current_user:
        enr = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.user_id == current_user.id
        ).first()
        is_enrolled = enr is not None
        if is_enrolled:
            completed_records = db.query(CourseLessonProgress.lesson_id).filter(
                CourseLessonProgress.course_id == course.id,
                CourseLessonProgress.user_id == current_user.id,
                CourseLessonProgress.is_completed == True
            ).all()
            completed_lesson_ids = {r[0] for r in completed_records}

    lesson_responses = []
    for l in course.lessons:
        lesson_responses.append(LessonResponse(
            id=l.id,
            course_id=l.course_id,
            title=l.title,
            slug=l.slug,
            description=l.description,
            content=l.content,
            video_url=l.video_url,
            duration_minutes=l.duration_minutes,
            order_index=l.order_index,
            is_completed=l.id in completed_lesson_ids
        ))

    total = len(lesson_responses)
    completed = len(completed_lesson_ids)
    progress_pct = round((completed / total * 100), 1) if total > 0 else 0.0

    return CourseDetailResponse(
        id=course.id,
        title=course.title,
        slug=course.slug,
        description=course.description,
        level=course.level,
        cover_image=course.cover_image,
        instructor_name=course.instructor.name if course.instructor else "Giảng viên IT Blog",
        category_name=course.category.name if course.category else "Chung",
        lessons=lesson_responses,
        total_lessons=total,
        completed_lessons=completed,
        user_progress_percent=progress_pct,
        is_enrolled=is_enrolled,
        created_at=course.created_at
    )


@router.post("", response_model=CourseDetailResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new course with lessons.
    """
    clean_title = data.title.strip() if data.title else ""
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tiêu đề khóa học không được để trống."
        )

    clean_desc = data.description.strip() if data.description else ""
    if not clean_desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mô tả khóa học không được để trống."
        )

    clean_level = data.level.lower().strip() if data.level else "beginner"
    if clean_level not in {"beginner", "intermediate", "advanced"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cấp độ khóa học không hợp lệ. Cho phép: beginner, intermediate, advanced."
        )

    if data.category_id:
        cat = db.query(Category).filter(Category.id == data.category_id).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chuyên mục được chỉ định không tồn tại."
            )

    if data.lessons:
        for idx, l in enumerate(data.lessons):
            clean_lesson_title = l.title.strip() if l.title else ""
            if not clean_lesson_title:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tiêu đề bài học thứ {idx + 1} không được để trống."
                )

    base_slug = slugify(clean_title) or "khoa-hoc"
    slug = base_slug
    counter = 1
    while db.query(Course).filter(Course.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    course = Course(
        title=clean_title,
        slug=slug,
        description=clean_desc,
        category_id=data.category_id,
        level=clean_level,
        cover_image=data.cover_image,
        instructor_id=current_user.id,
        status="published"
    )
    db.add(course)
    db.flush()

    if data.lessons:
        for idx, l in enumerate(data.lessons):
            lesson = CourseLesson(
                course_id=course.id,
                title=l.title.strip(),
                slug=f"{slug}-bai-{idx+1}",
                description=l.description,
                content=l.content,
                video_url=l.video_url,
                duration_minutes=l.duration_minutes,
                order_index=l.order_index if l.order_index is not None else idx
            )
            db.add(lesson)

    db.commit()
    db.refresh(course)

    lessons_res = [
        LessonResponse(
            id=l.id,
            course_id=l.course_id,
            title=l.title,
            slug=l.slug,
            description=l.description,
            content=l.content,
            video_url=l.video_url,
            duration_minutes=l.duration_minutes,
            order_index=l.order_index,
            is_completed=False
        )
        for l in course.lessons
    ]

    return CourseDetailResponse(
        id=course.id,
        title=course.title,
        slug=course.slug,
        description=course.description,
        level=course.level,
        cover_image=course.cover_image,
        instructor_name=current_user.name,
        category_name=course.category.name if course.category else "Chung",
        lessons=lessons_res,
        total_lessons=len(lessons_res),
        completed_lessons=0,
        user_progress_percent=0.0,
        is_enrolled=False,
        created_at=course.created_at
    )


@router.post("/{id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_course(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Enroll into an IT course.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại")

    is_privileged = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if course.status != "published" and course.instructor_id != current_user.id and not is_privileged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khóa học này hiện chưa được xuất bản hoặc đã lưu trữ."
        )

    existing = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == id,
        CourseEnrollment.user_id == current_user.id
    ).first()

    if not existing:
        existing = CourseEnrollment(
            user_id=current_user.id,
            course_id=id,
            status="enrolled",
            enrolled_at=datetime.now(timezone.utc)
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)

    return EnrollmentResponse(
        course_id=existing.course_id,
        status=existing.status,
        enrolled_at=existing.enrolled_at
    )


@router.post("/{id}/lessons/{lesson_id}/complete", response_model=LessonProgressToggle)
@router.post("/{id}/lessons/{lesson_id}/toggle", response_model=LessonProgressToggle)
def complete_lesson(
    id: int,
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Toggle completed status of a lesson for current enrolled student.
    """
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id, CourseLesson.course_id == id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài học không tồn tại trong khóa học")

    # Auto enroll if not yet enrolled
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == id,
        CourseEnrollment.user_id == current_user.id
    ).first()
    if not enrollment:
        course = db.query(Course).filter(Course.id == id).first()
        is_privileged = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
        if course and course.status != "published" and course.instructor_id != current_user.id and not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khóa học này hiện chưa được xuất bản hoặc đã lưu trữ."
            )
        enrollment = CourseEnrollment(
            user_id=current_user.id,
            course_id=id,
            status="enrolled",
            enrolled_at=datetime.now(timezone.utc)
        )
        db.add(enrollment)
        db.flush()

    progress = db.query(CourseLessonProgress).filter(
        CourseLessonProgress.course_id == id,
        CourseLessonProgress.lesson_id == lesson_id,
        CourseLessonProgress.user_id == current_user.id
    ).first()

    if progress:
        progress.is_completed = not progress.is_completed
        progress.completed_at = datetime.now(timezone.utc) if progress.is_completed else None
        new_status = progress.is_completed
    else:
        progress = CourseLessonProgress(
            user_id=current_user.id,
            course_id=id,
            lesson_id=lesson_id,
            is_completed=True,
            completed_at=datetime.now(timezone.utc)
        )
        db.add(progress)
        new_status = True

    db.commit()

    total = db.query(CourseLesson).filter(CourseLesson.course_id == id).count()
    completed = db.query(CourseLessonProgress).filter(
        CourseLessonProgress.course_id == id,
        CourseLessonProgress.user_id == current_user.id,
        CourseLessonProgress.is_completed == True
    ).count()
    pct = round((completed / total * 100), 1) if total > 0 else 0.0

    if total > 0:
        if completed == total:
            enrollment.status = "completed"
            enrollment.completed_at = datetime.now(timezone.utc)
        else:
            enrollment.status = "enrolled"
            enrollment.completed_at = None
        db.commit()

    return LessonProgressToggle(
        lesson_id=lesson_id,
        is_completed=new_status,
        completed_lessons=completed,
        total_lessons=total,
        progress_percent=pct
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a course. Instructor or admin/moderator can delete.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại")

    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if course.instructor_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa khóa học này.")

    db.query(CourseLessonProgress).filter(CourseLessonProgress.course_id == id).delete(synchronize_session=False)
    db.query(CourseEnrollment).filter(CourseEnrollment.course_id == id).delete(synchronize_session=False)
    db.query(QuizQuestion).filter(QuizQuestion.course_id == id).update({"course_id": None}, synchronize_session=False)
    db.delete(course)
    db.commit()
    return None
