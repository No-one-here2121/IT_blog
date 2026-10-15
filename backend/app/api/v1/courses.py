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
    CourseUpdate,
    CourseResponse,
    CourseDetailResponse,
    LessonCreate,
    LessonUpdate,
    LessonResponse,
    EnrollmentResponse,
    LessonProgressToggle
)
from app.api.deps import get_current_active_user, get_current_user_optional

router = APIRouter(prefix="/courses", tags=["Learning Hub & Courses"])


def ensure_default_courses_seeded(db: Session):
    existing_titles = {c.title.strip().lower() for c in db.query(Course.title).all()}
    admin_user = db.query(User).filter(User.is_superuser == True).first()
    if not admin_user:
        admin_user = db.query(User).first()
    if not admin_user:
        return

    defaults = [
        {
            "title": "Khóa học FastAPI & Microservices Masterclass 2026",
            "slug": "fastapi-microservices-masterclass",
            "description": "Xây dựng hệ thống RESTful API chuẩn Enterprise, tích hợp xác thực JWT, Redis Caching, PostgreSQL ORM SQLAlchemy 2.0 và Docker.",
            "level": "intermediate",
            "category_name": "Backend",
            "cover_image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
            "lessons": [
                {
                    "title": "Bài 1: Kiến trúc Dependency Injection & Lifespan trong FastAPI",
                    "duration_minutes": 25,
                    "video_url": "https://www.youtube.com/watch?v=0rsXZXb3vEQ",
                    "content": "FastAPI cung cấp hệ thống Dependency Injection cực kỳ mạnh mẽ và dễ mở rộng. Dùng Lifespan context manager để khởi tạo connection pools trước khi nhận request và giải phóng an toàn khi ứng dụng shutdown."
                },
                {
                    "title": "Bài 2: Tối ưu kết nối Async SQLAlchemy 2.0 & Connection Pooling",
                    "duration_minutes": 35,
                    "video_url": "https://www.youtube.com/watch?v=0rsXZXb3vEQ",
                    "content": "SQLAlchemy 2.0 chuyển hẳn sang phong cách Async native với async_sessionmaker. Việc tối ưu kích thước pool_size và pool_recycle giúp hệ thống tránh tình trạng nghẽn connection khi hàng nghìn request đổ về đồng thời."
                },
                {
                    "title": "Bài 3: Triển khai Caching với Redis và Rate Limiter",
                    "duration_minutes": 30,
                    "video_url": "https://www.youtube.com/watch?v=0rsXZXb3vEQ",
                    "content": "Caching giúp giảm tải tới 90% truy vấn trực tiếp vào Database. Khi kết hợp với Sliding Window Rate Limiting, hệ thống sẽ được bảo vệ tuyệt đối trước các đợt tấn công DoS hoặc spam API."
                }
            ]
        },
        {
            "title": "Khóa học Lập trình React 19 & Next.js Thực chiến",
            "slug": "react-19-nextjs-thuc-chien",
            "description": "Làm chủ Server Actions, Server Components, Zustand state management và Tailwind CSS để xây dựng web application hiệu năng cao.",
            "level": "beginner",
            "category_name": "Frontend",
            "cover_image": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
            "lessons": [
                {
                    "title": "Bài 1: Nền tảng React 19, Hooks và State Management",
                    "duration_minutes": 30,
                    "video_url": "https://www.youtube.com/watch?v=SqcY0GlETPk",
                    "content": "Làm quen với các tính năng mới trong React 19: Action Hooks, useActionState, useOptimistic. Hiểu rõ sự khác biệt giữa Client Components và React Server Components (RSC)."
                },
                {
                    "title": "Bài 2: Tối ưu render, memoization và Responsive Tailwind",
                    "duration_minutes": 40,
                    "video_url": "https://www.youtube.com/watch?v=SqcY0GlETPk",
                    "content": "Hướng dẫn tối ưu re-render với useMemo, useCallback, kết hợp Tailwind CSS xây dựng giao diện chuẩn responsive trên mọi thiết bị."
                }
            ]
        },
        {
            "title": "Khóa học DevOps Thực chiến: Docker, Kubernetes & CI/CD",
            "slug": "devops-docker-k8s-cicd",
            "description": "Tự động hóa triển khai sản phẩm lên Kubernetes Cluster, quản lý bí mật bảo mật và xây dựng pipeline kiểm thử tự động với GitHub Actions.",
            "level": "advanced",
            "category_name": "DevOps",
            "cover_image": "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=80",
            "lessons": [
                {
                    "title": "Bài 1: Docker Multi-Stage Build tối ưu hoá dung lượng",
                    "duration_minutes": 25,
                    "video_url": "https://www.youtube.com/watch?v=hBYkWQvPVkY",
                    "content": "Kỹ thuật Multi-stage build giúp giảm kích thước Docker image từ hàng trăm MB xuống còn vài chục MB, tối ưu tốc độ kéo thả image khi deploy."
                },
                {
                    "title": "Bài 2: Thiết lập K8s Deployment, Service và HPA",
                    "duration_minutes": 45,
                    "video_url": "https://www.youtube.com/watch?v=DUZEw07g0Gs",
                    "content": "Triển khai K8s Deployment với RollingUpdate strategy không gián đoạn dịch vụ (Zero-downtime), cấu hình Horizontal Pod Autoscaler."
                }
            ]
        }
    ]

    for d in defaults:
        if d["title"].strip().lower() not in existing_titles:
            cat = db.query(Category).filter(Category.name.ilike(d["category_name"])).first()
            if not cat:
                cat = Category(name=d["category_name"], slug=slugify(d["category_name"]) or "chuyen-muc")
                db.add(cat)
                db.flush()

            course = Course(
                title=d["title"],
                slug=d["slug"],
                description=d["description"],
                level=d["level"],
                category_id=cat.id if cat else None,
                cover_image=d["cover_image"],
                instructor_id=admin_user.id,
                status="published"
            )
            db.add(course)
            db.flush()

            for idx, l in enumerate(d["lessons"]):
                lesson = CourseLesson(
                    course_id=course.id,
                    title=l["title"],
                    slug=f"{course.slug}-bai-{idx+1}",
                    content=l["content"],
                    video_url=l["video_url"],
                    duration_minutes=l["duration_minutes"],
                    order_index=idx
                )
                db.add(lesson)

    db.commit()


@router.get("", response_model=List[CourseResponse])
def get_courses(
    level: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    List courses in Learning Hub with enrollment status, lessons and completion progress.
    """
    try:
        ensure_default_courses_seeded(db)
    except Exception as seed_err:
        print(f"Course auto-seed error (non-fatal): {seed_err}")

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

    effective_user = current_user
    if not effective_user:
        effective_user = db.query(User).filter(User.is_superuser == True).first() or db.query(User).first()

    # Pre-fetch current user enrollment & progress in a single batch
    user_enrolled_courses = set()
    user_completed_counts = {}
    user_completed_lesson_ids = set()
    if effective_user:
        user_enrolled_courses = {
            r[0] for r in
            db.query(CourseEnrollment.course_id)
            .filter(CourseEnrollment.user_id == effective_user.id)
            .all()
        }
        user_completed_counts = dict(
            db.query(CourseLessonProgress.course_id, func.count(CourseLessonProgress.id))
            .filter(
                CourseLessonProgress.user_id == effective_user.id,
                CourseLessonProgress.is_completed == True
            )
            .group_by(CourseLessonProgress.course_id)
            .all()
        )
        user_completed_lesson_ids = {
            r[0] for r in
            db.query(CourseLessonProgress.lesson_id)
            .filter(
                CourseLessonProgress.user_id == effective_user.id,
                CourseLessonProgress.is_completed == True
            )
            .all()
        }

    for c in courses:
        total_lessons = len(c.lessons)
        enrolled_count = enrolled_counts.get(c.id, 0)
        is_enrolled = c.id in user_enrolled_courses
        completed_count = user_completed_counts.get(c.id, 0) if is_enrolled else 0
        progress_pct = round((completed_count / total_lessons * 100), 1) if (is_enrolled and total_lessons > 0) else 0.0

        lesson_responses = [
            LessonResponse(
                id=l.id,
                course_id=l.course_id,
                title=l.title,
                slug=l.slug,
                description=l.description,
                content=l.content or "",
                video_url=l.video_url,
                duration_minutes=l.duration_minutes,
                order_index=l.order_index,
                is_completed=l.id in user_completed_lesson_ids
            )
            for l in c.lessons
        ]

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
            lessons=lesson_responses,
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

    effective_user = current_user
    if not effective_user:
        effective_user = db.query(User).filter(User.is_superuser == True).first() or db.query(User).first()

    completed_lesson_ids = set()
    is_enrolled = False
    if effective_user:
        enr = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.user_id == effective_user.id
        ).first()
        is_enrolled = enr is not None
        if is_enrolled:
            completed_records = db.query(CourseLessonProgress.lesson_id).filter(
                CourseLessonProgress.course_id == course.id,
                CourseLessonProgress.user_id == effective_user.id,
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

    category_id = data.category_id
    if not category_id and data.category_name:
        cat_name = data.category_name.strip()
        cat = db.query(Category).filter(Category.name.ilike(cat_name)).first()
        if not cat:
            cat = Category(name=cat_name, slug=slugify(cat_name) or "chuyen-muc")
            db.add(cat)
            db.flush()
        category_id = cat.id
    elif category_id:
        cat = db.query(Category).filter(Category.id == category_id).first()
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
        category_id=category_id,
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
                content=l.content or "",
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
        category_name=course.category.name if course.category else (data.category_name or "Chung"),
        lessons=lessons_res,
        total_lessons=len(lessons_res),
        completed_lessons=0,
        user_progress_percent=0.0,
        is_enrolled=False,
        created_at=course.created_at
    )


@router.put("/{id}", response_model=CourseDetailResponse)
def update_course(
    id: int,
    data: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update course details and synchronize its curriculum lessons.
    Instructor or admin/moderator can update.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại")

    is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
    if course.instructor_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền chỉnh sửa khóa học này.")

    if data.title is not None:
        clean_title = data.title.strip()
        if not clean_title:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tiêu đề khóa học không được để trống.")
        course.title = clean_title

    if data.description is not None:
        clean_desc = data.description.strip()
        if not clean_desc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mô tả khóa học không được để trống.")
        course.description = clean_desc

    if data.level is not None:
        clean_level = data.level.lower().strip()
        if clean_level not in {"beginner", "intermediate", "advanced"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cấp độ khóa học không hợp lệ.")
        course.level = clean_level

    if data.cover_image is not None:
        course.cover_image = data.cover_image

    if data.status is not None:
        course.status = data.status

    if data.category_id is not None:
        if data.category_id > 0:
            cat = db.query(Category).filter(Category.id == data.category_id).first()
            if cat:
                course.category_id = cat.id
        else:
            course.category_id = None
    elif data.category_name is not None:
        cat_name = data.category_name.strip()
        if cat_name:
            cat = db.query(Category).filter(Category.name.ilike(cat_name)).first()
            if not cat:
                cat = Category(name=cat_name, slug=slugify(cat_name) or "chuyen-muc")
                db.add(cat)
                db.flush()
            course.category_id = cat.id

    # Synchronize lessons if provided
    if data.lessons is not None:
        for idx, l_item in enumerate(data.lessons):
            if not l_item.title or not l_item.title.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tiêu đề bài học thứ {idx + 1} không được để trống."
                )

        existing_lessons = {l.id: l for l in course.lessons}
        kept_lesson_ids = set()

        for idx, l_data in enumerate(data.lessons):
            clean_l_title = l_data.title.strip()
            clean_duration = l_data.duration_minutes if l_data.duration_minutes and l_data.duration_minutes > 0 else 15
            clean_order = l_data.order_index if l_data.order_index is not None else idx
            clean_video = l_data.video_url.strip() if l_data.video_url else None
            clean_content = l_data.content if l_data.content is not None else ""
            clean_desc = l_data.description.strip() if l_data.description else None

            if l_data.id and l_data.id in existing_lessons:
                # Update existing lesson
                lesson = existing_lessons[l_data.id]
                lesson.title = clean_l_title
                lesson.duration_minutes = clean_duration
                lesson.order_index = clean_order
                lesson.video_url = clean_video
                lesson.content = clean_content
                lesson.description = clean_desc
                kept_lesson_ids.add(lesson.id)
            else:
                # Add new lesson
                lesson_slug = f"{course.slug}-bai-{int(datetime.now(timezone.utc).timestamp())}-{idx+1}"
                new_lesson = CourseLesson(
                    course_id=course.id,
                    title=clean_l_title,
                    slug=lesson_slug,
                    description=clean_desc,
                    content=clean_content,
                    video_url=clean_video,
                    duration_minutes=clean_duration,
                    order_index=clean_order
                )
                db.add(new_lesson)

        # Remove deleted lessons and their user progress
        for lesson_id, lesson in existing_lessons.items():
            if lesson_id not in kept_lesson_ids:
                db.query(CourseLessonProgress).filter(
                    CourseLessonProgress.course_id == course.id,
                    CourseLessonProgress.lesson_id == lesson_id
                ).delete(synchronize_session=False)
                db.delete(lesson)

    db.commit()
    db.refresh(course)

    # Determine completion and enrollment for current user
    completed_lesson_ids = set()
    is_enrolled = False
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

    lesson_responses = [
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
            is_completed=l.id in completed_lesson_ids
        )
        for l in course.lessons
    ]

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
        instructor_name=course.instructor.name if course.instructor else current_user.name,
        category_name=course.category.name if course.category else "Chung",
        lessons=lesson_responses,
        total_lessons=total,
        completed_lessons=completed,
        user_progress_percent=progress_pct,
        is_enrolled=is_enrolled,
        created_at=course.created_at
    )


@router.post("/{id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_course(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Enroll into an IT course.
    """
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại")

    effective_user = current_user
    if not effective_user:
        effective_user = db.query(User).filter(User.is_superuser == True).first() or db.query(User).first()

    user_id = effective_user.id if effective_user else 1

    existing = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == id,
        CourseEnrollment.user_id == user_id
    ).first()

    if not existing:
        existing = CourseEnrollment(
            user_id=user_id,
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
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Toggle completed status of a lesson for current enrolled student.
    """
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id, CourseLesson.course_id == id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài học không tồn tại trong khóa học")

    effective_user = current_user
    if not effective_user:
        effective_user = db.query(User).filter(User.is_superuser == True).first() or db.query(User).first()

    user_id = effective_user.id if effective_user else 1

    # Auto enroll if not yet enrolled
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == id,
        CourseEnrollment.user_id == user_id
    ).first()
    if not enrollment:
        enrollment = CourseEnrollment(
            user_id=user_id,
            course_id=id,
            status="enrolled",
            enrolled_at=datetime.now(timezone.utc)
        )
        db.add(enrollment)
        db.flush()

    progress = db.query(CourseLessonProgress).filter(
        CourseLessonProgress.course_id == id,
        CourseLessonProgress.lesson_id == lesson_id,
        CourseLessonProgress.user_id == user_id
    ).first()

    if progress:
        progress.is_completed = not progress.is_completed
        progress.completed_at = datetime.now(timezone.utc) if progress.is_completed else None
        new_status = progress.is_completed
    else:
        progress = CourseLessonProgress(
            user_id=user_id,
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
        CourseLessonProgress.user_id == user_id,
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
