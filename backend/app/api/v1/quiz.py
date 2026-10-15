import os
import json
import logging
import random
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.models.user import User
from app.models.post import Post
from app.models.course import Course
from app.models.quiz import QuizQuestion, QuizQuestionPost
from app.schemas.quiz import (
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizGenerateRequest,
    QuizSubmitRequest,
    QuizSubmitResponse,
    QuizSubmitDetail
)
from app.services.gemini_service import gemini_service
from app.api.deps import get_current_user_optional, get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Quiz & Knowledge Testing"])


def build_fallback_questions(
    material: str,
    count: int,
    language: str = "IT",
    difficulty: str = "medium"
) -> List[Dict[str, Any]]:
    """Generate high-quality default fallback questions when AI service is unavailable."""
    sample_bank = [
        {
            "question": "Trong React 19, cú pháp để sử dụng Form Actions và xử lý trạng thái submit bất đồng bộ là gì?",
            "options": ["Sử dụng hook useActionState()", "Sử dụng hook useEffect() kết hợp useState()", "Bắt buộc dùng Redux Thunk", "Dùng useCallback() với ref"],
            "answer_index": 0,
            "explanation": "React 19 giới thiệu hook useActionState để tự động quản lý trạng thái loading, lỗi và kết quả trả về của Form Actions.",
            "difficulty": "medium",
            "lang": "React"
        },
        {
            "question": "FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (data validation) và serialization?",
            "options": ["Marshmallow", "Pydantic", "Django REST Serializer", "Cerberus"],
            "answer_index": 1,
            "explanation": "FastAPI được xây dựng dựa trên Pydantic để thực hiện validation dữ liệu tự động với hiệu năng cao bằng Rust (Pydantic V2).",
            "difficulty": "easy",
            "lang": "FastAPI"
        },
        {
            "question": "Mục tiêu cốt lõi của việc thiết lập Connection Pooling trong PostgreSQL / SQLAlchemy 2.0 là gì?",
            "options": ["Mã hóa dữ liệu tại chỗ", "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm overhead khởi tạo kết nối TCP/TLS", "Tự động phân vùng bảng lớn", "Tăng kích thước RAM của máy chủ"],
            "answer_index": 1,
            "explanation": "Khởi tạo kết nối PostgreSQL tốn kém tài nguyên. Connection Pooling duy trì một nhóm kết nối sẵn sàng để tái sử dụng ngay lập tức.",
            "difficulty": "medium",
            "lang": "PostgreSQL"
        },
        {
            "question": "Trong kiến trúc Microservices, Pattern nào thường được sử dụng để duy trì tính nhất quán dữ liệu giữa các dịch vụ phân tán?",
            "options": ["Singleton Pattern", "Saga Pattern (Choreography hoặc Orchestration)", "Factory Pattern", "Decorator Pattern"],
            "answer_index": 1,
            "explanation": "Saga Pattern chia transaction phân tán thành chuỗi các local transaction với các giao dịch bù trừ (compensating transactions) khi có lỗi.",
            "difficulty": "hard",
            "lang": "Architecture"
        },
        {
            "question": "Trong quy trình CI/CD với Docker, Multi-stage Build mang lại lợi ích quan trọng nào?",
            "options": ["Cho phép chạy nhiều container cùng một port", "Giảm đáng kể kích thước image thành phẩm bằng cách loại bỏ compiler và dev dependencies", "Tự động backup dữ liệu container", "Thay thế hoàn toàn Kubernetes"],
            "answer_index": 1,
            "explanation": "Multi-stage build tách biệt giai đoạn build và runtime, chỉ copy artifact cần thiết vào image cuối, giúp tối ưu dung lượng và bảo mật.",
            "difficulty": "easy",
            "lang": "DevOps"
        },
        {
            "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
            "options": ["Loại bỏ hoàn toàn GIL (Global Interpreter Lock)", "Dự án Faster CPython (Adaptive specializing interpreter)", "Chuyển sang JIT compiler của PyPy", "Bắt buộc biên dịch AOT"],
            "answer_index": 1,
            "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
            "difficulty": "hard",
            "lang": "Python"
        }
    ]

    # Filter matching language if possible
    matched = [q for q in sample_bank if language.lower() in q.get("lang", "").lower()]
    if not matched:
        matched = sample_bank

    results = []
    for i in range(count):
        item = matched[i % len(matched)].copy()
        if difficulty in ["easy", "medium", "hard"]:
            item["difficulty"] = difficulty
        results.append(item)

    return results



_TOPICS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "quiz_topics.json")

DEFAULT_TOPICS_METADATA = [
    {
        "id": "all",
        "title": "Tất cả Đề tài",
        "icon": "🌐",
        "badge": "Toàn diện",
        "description": "Luyện tập tổng hợp câu hỏi từ tất cả các chuyên đề kỹ thuật."
    },
    {
        "id": "React",
        "title": "React 19 & Frontend",
        "icon": "⚛️",
        "badge": "Frontend",
        "description": "Hooks, Server Actions, useActionState, Suspense, Fiber và React Compiler."
    },
    {
        "id": "FastAPI",
        "title": "FastAPI & Backend",
        "icon": "⚡",
        "badge": "Backend",
        "description": "Async def, Pydantic V2, Dependency Injection, Lifespan và CORS."
    },
    {
        "id": "PostgreSQL",
        "title": "PostgreSQL & Database",
        "icon": "🐘",
        "badge": "Database",
        "description": "Connection Pooling, GIN Index, EXPLAIN ANALYZE, MVCC và Partitioning."
    },
    {
        "id": "DevOps",
        "title": "DevOps, Docker & K8s",
        "icon": "🐳",
        "badge": "DevOps",
        "description": "Multi-stage builds, Kubernetes Pods/Probes, CI/CD và Reverse Proxy."
    },
    {
        "id": "Python",
        "title": "Python Core & Async",
        "icon": "🐍",
        "badge": "Language",
        "description": "Asyncio TaskGroup, Faster CPython 3.11+, Generators, GIL và Metaclasses."
    },
    {
        "id": "Security",
        "title": "Bảo mật Web & Ứng dụng",
        "icon": "🛡️",
        "badge": "Security",
        "description": "OWASP Top 10, SQL Injection, XSS, CSRF, JWT và Password Hashing."
    },
    {
        "id": "Architecture",
        "title": "Kiến trúc Hệ thống",
        "icon": "🏗️",
        "badge": "System Design",
        "description": "Microservices, Saga Pattern, Caching Redis, Kafka vs RabbitMQ và CAP."
    },
    {
        "id": "Fullstack",
        "title": "Fullstack Engineering",
        "icon": "💻",
        "badge": "Software Eng",
        "description": "gRPC vs REST, HTTP/2 & 3, SSE, SOLID, Clean Architecture và SemVer."
    }
]

TOPIC_ALIASES = {
    "all": [],
    "React": ["react", "react 19", "frontend", "tailwind css", "tailwind", "nextjs", "next.js", "ui"],
    "FastAPI": ["fastapi", "backend", "pydantic", "fastapi & backend", "fastapi / python"],
    "PostgreSQL": ["postgresql", "postgres", "database", "sql", "csdl"],
    "DevOps": ["devops", "docker", "ci/cd", "kubernetes", "k8s", "docker / devops", "linux"],
    "Python": ["python", "asyncio", "python core", "cpython"],
    "Security": ["security", "web security", "owasp", "bảo mật", "bảo mật web", "jwt"],
    "Architecture": ["architecture", "microservices", "system design", "kiến trúc", "hệ thống", "kiến trúc hệ thống"],
    "Fullstack": ["fullstack", "full stack", "html5", "css3", "javascript", "html/web", "web", "clean architecture"]
}


def get_topics_metadata() -> List[Dict[str, Any]]:
    if os.path.exists(_TOPICS_FILE):
        try:
            with open(_TOPICS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as e:
            logger.warning(f"Error loading quiz_topics.json: {e}")
    return DEFAULT_TOPICS_METADATA


@router.get("/topics", response_model=List[Dict[str, Any]])
def get_quiz_topics(db: Session = Depends(get_db)):
    """
    Lấy danh sách các chuyên đề thi trắc nghiệm kèm số lượng câu hỏi thực tế trong CSDL.
    """
    counts = dict(
        db.query(QuizQuestion.language, func.count(QuizQuestion.id))
        .group_by(QuizQuestion.language)
        .all()
    )
    total_all = sum(counts.values())

    topics = []
    for item in get_topics_metadata():
        t_id = item["id"]
        if t_id == "all":
            cnt = total_all
        else:
            aliases = TOPIC_ALIASES.get(t_id, [t_id.lower()])
            matched_langs = {
                lang for lang in counts.keys()
                if any(alias in (lang or "").lower() for alias in aliases)
            }
            cnt = sum(counts[lang] for lang in matched_langs)
        topics.append({
            **item,
            "question_count": cnt
        })
    return topics


@router.get("/questions", response_model=Dict[str, List[QuizQuestionResponse]])
def get_quiz_questions(
    course_id: Optional[int] = Query(None, description="Lọc theo ID khóa học"),
    post_id: Optional[int] = Query(None, description="Lọc theo ID bài viết"),
    language: Optional[str] = Query(None, description="Lọc theo ngôn ngữ lập trình / công nghệ"),
    difficulty: Optional[str] = Query(None, description="Lọc theo độ khó (easy, medium, hard)"),
    limit: int = Query(50, ge=1, le=500, description="Giới hạn số lượng câu hỏi"),
    randomize: bool = Query(False, description="Xáo trộn thứ tự câu hỏi ngẫu nhiên"),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách câu hỏi trắc nghiệm từ ngân hàng đề thi.
    Hỗ trợ lọc theo Khóa học, Bài viết liên quan, Ngôn ngữ, hoặc Độ khó, kèm tính năng lấy ngẫu nhiên và chọn số lượng câu hỏi.
    """
    query = db.query(QuizQuestion)

    if post_id is not None:
        # Kiểm tra xem bài viết đã có câu hỏi trắc nghiệm chưa, nếu chưa có thì tự động sinh hoặc liên kết
        count_existing = db.query(QuizQuestionPost).filter(QuizQuestionPost.post_id == post_id).count()
        if count_existing == 0:
            target_post = db.query(Post).filter(Post.id == post_id).first()
            if target_post:
                from app.services.quiz_generator import ensure_post_quiz_questions
                ensure_post_quiz_questions(db, target_post, count=5)

        query = query.join(QuizQuestionPost, QuizQuestionPost.question_id == QuizQuestion.id)\
                     .filter(QuizQuestionPost.post_id == post_id)
        if isinstance(difficulty, str) and difficulty.strip() and difficulty.lower().strip() != "mixed":
            diff_q = query.filter(QuizQuestion.difficulty == difficulty.lower().strip())
            if diff_q.count() > 0:
                query = diff_q
    elif course_id is not None:
        course_q = query.filter(QuizQuestion.course_id == course_id)
        if isinstance(difficulty, str) and difficulty.strip() and difficulty.lower().strip() != "mixed":
            course_q = course_q.filter(QuizQuestion.difficulty == difficulty.lower().strip())

        if course_q.count() > 0:
            query = course_q
        else:
            # Fallback by course category or title
            target_course = db.query(Course).filter(Course.id == course_id).first()
            if target_course:
                course_topic = (target_course.category.name if target_course.category else target_course.title) or ""
                aliases = TOPIC_ALIASES.get(course_topic, [course_topic.lower()])
                query = query.filter(or_(*[QuizQuestion.language.ilike(f"%{a}%") for a in aliases]))
                if isinstance(difficulty, str) and difficulty.strip() and difficulty.lower().strip() != "mixed":
                    diff_q = query.filter(QuizQuestion.difficulty == difficulty.lower().strip())
                    if diff_q.count() > 0:
                        query = diff_q
            else:
                query = course_q
    else:
        if isinstance(language, str) and language.strip().lower() not in ["all", "tất cả", "tat ca", ""]:
            clean_lang = language.strip()
            aliases = TOPIC_ALIASES.get(clean_lang, [clean_lang.lower()])
            query = query.filter(or_(*[QuizQuestion.language.ilike(f"%{a}%") for a in aliases]))
        if isinstance(difficulty, str) and difficulty.strip() and difficulty.lower().strip() != "mixed":
            query = query.filter(QuizQuestion.difficulty == difficulty.lower().strip())

    # Lấy danh sách ngẫu nhiên hoặc theo thứ tự
    if randomize:
        items = query.order_by(func.random()).limit(limit).all()
    else:
        items = query.order_by(QuizQuestion.id.asc()).limit(limit).all()

    # Nếu chưa có câu hỏi nào theo filter và không chỉ định post_id/course_id, lấy câu hỏi chung
    if not items and post_id is None and course_id is None:
        fallback_q = db.query(QuizQuestion)
        if randomize:
            items = fallback_q.order_by(func.random()).limit(limit).all()
        else:
            items = fallback_q.order_by(QuizQuestion.id.asc()).limit(limit).all()

        # Batch fetch post links for all retrieved questions to eliminate N+1 queries
    q_ids = [item.id for item in items]
    links_by_qid = {}
    if q_ids:
        post_links = db.query(QuizQuestionPost.question_id, QuizQuestionPost.post_id).filter(
            QuizQuestionPost.question_id.in_(q_ids)
        ).all()
        for qid, pid in post_links:
            links_by_qid.setdefault(qid, []).append(pid)

    response_items: List[QuizQuestionResponse] = []
    for item in items:
        pids = links_by_qid.get(item.id, [])

        opts = item.options
        if isinstance(opts, str):
            try:
                opts = json.loads(opts)
            except Exception:
                opts = []

        response_items.append(
            QuizQuestionResponse(
                id=item.id,
                course_id=item.course_id,
                language=item.language or "",
                question=item.question,
                options=opts if isinstance(opts, list) else [],
                answer_index=item.answer_index,
                explanation=item.explanation or "",
                difficulty=item.difficulty or "medium",
                source=item.source or "manual",
                created_by=item.created_by,
                created_at=item.created_at,
                post_ids=pids
            )
        )

    return {"questions": response_items}


@router.post("/questions", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_quiz_question(
    data: QuizQuestionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Thêm mới thủ công 1 câu hỏi trắc nghiệm vào ngân hàng đề thi và lưu vào PostgreSQL.
    """
    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Nội dung câu hỏi không được để trống.")
    clean_options = [opt.strip() for opt in data.options if isinstance(opt, str) and opt.strip()]
    if len(clean_options) < 2:
        raise HTTPException(status_code=400, detail="Câu hỏi phải có ít nhất 2 phương án lựa chọn không rỗng.")

    # Normalize answer_index / correct_index
    idx = data.answer_index
    if idx is None or idx < 0:
        idx = getattr(data, "correct_index", None)
    if idx is None or idx < 0:
        idx = 0
    if idx >= len(clean_options):
        idx = 0

    # Normalize difficulty
    raw_diff = str(data.difficulty or "medium").lower().strip()
    diff_map = {
        "easy": "easy", "basic": "easy", "cơ bản": "easy", "co ban": "easy", "dễ": "easy", "de": "easy",
        "medium": "medium", "intermediate": "medium", "trung bình": "medium", "trung binh": "medium", "vừa": "medium", "vua": "medium",
        "hard": "hard", "advanced": "hard", "nâng cao": "hard", "nang cao": "hard", "khó": "hard", "kho": "hard"
    }
    clean_diff = diff_map.get(raw_diff, "medium")

    if data.course_id:
        course = db.query(Course).filter(Course.id == data.course_id).first()
        if not course:
            raise HTTPException(status_code=400, detail="Khóa học được chỉ định không tồn tại.")

    user_id = getattr(current_user, "id", None) if (current_user and not hasattr(current_user, "dependency")) else None

    # Handle code snippet if attached
    final_question = data.question.strip()
    if hasattr(data, "code_snippet") and data.code_snippet and data.code_snippet.strip():
        snippet = data.code_snippet.strip()
        if snippet not in final_question:
            final_question = f"{final_question}\n\n```\n{snippet}\n```"

    question = QuizQuestion(
        course_id=data.course_id,
        language=data.language or "IT",
        question=final_question,
        options=clean_options,
        answer_index=idx,
        explanation=data.explanation or "",
        difficulty=clean_diff,
        source="manual",
        created_by=user_id
    )
    db.add(question)
    db.flush()

    if data.post_ids:
        for pid in data.post_ids:
            if db.query(Post.id).filter(Post.id == pid).first():
                link = QuizQuestionPost(question_id=question.id, post_id=pid)
                db.add(link)

    db.commit()
    db.refresh(question)

    return {
        "ok": True,
        "message": "Tạo câu hỏi trắc nghiệm thành công và đã lưu vào cơ sở dữ liệu PostgreSQL.",
        "id": question.id,
        "question_id": question.id,
        "language": question.language,
        "question": question.question,
        "options": question.options,
        "answer_index": question.answer_index,
        "correct_index": question.answer_index,
        "explanation": question.explanation or "",
        "difficulty": question.difficulty,
        "course_id": question.course_id,
        "source": question.source,
        "created_at": question.created_at.isoformat() if question.created_at else None
    }


@router.delete("/questions/{id}")
def delete_quiz_question(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Xóa 1 câu hỏi trắc nghiệm khỏi hệ thống (Yêu cầu tác giả hoặc Admin/Moderator).
    """
    q = db.query(QuizQuestion).filter(QuizQuestion.id == id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại.")

    if q.created_by is not None:
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Vui lòng đăng nhập để thực hiện thao tác này.")
        is_admin = current_user.is_superuser or any(r.name in ["admin", "moderator"] for r in current_user.roles)
        if q.created_by != current_user.id and not is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa câu hỏi này.")

    # Clean up dependent associations
    db.query(QuizQuestionPost).filter(QuizQuestionPost.question_id == id).delete(synchronize_session=False)
    db.delete(q)
    db.commit()
    return {"ok": True, "deleted_id": id}


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_quiz_with_ai(
    req: QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Tự động sinh bộ câu hỏi trắc nghiệm bằng Trí tuệ Nhân tạo (Gemini AI)
    dựa trên nội dung Khóa học hoặc các Bài viết được chỉ định.
    """
    materials = []
    lang = req.language or ""
    course = None
    posts = []
    valid_course_id = None

    if req.course_id:
        course = db.query(Course).filter(Course.id == req.course_id).first()
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại.")
        valid_course_id = course.id
        if not lang:
            lang = course.title
        course_text = f"KHÓA HỌC: {course.title}\nMô tả: {course.description}\n"
        if course.lessons:
            for idx, lesson in enumerate(course.lessons, 1):
                course_text += f"\nBài {idx}: {lesson.title}\n{lesson.content[:1000]}"
        materials.append(course_text)

    if req.post_ids:
        posts = db.query(Post).filter(Post.id.in_(req.post_ids)).all()
        for idx, post in enumerate(posts, 1):
            if not lang and post.category:
                lang = post.category.name if hasattr(post.category, "name") else str(post.category)
            materials.append(f"--- BÀI {idx}: {post.title} ---\n{post.content[:3000]}")

    if not materials:
        materials.append(f"Chủ đề kỹ thuật và kiến thức lập trình: {lang or 'Công nghệ thông tin, Lập trình Web & Backend'}")

    context_str = "\n\n".join(materials)[:8000]
    count = max(1, min(req.count, 10))
    difficulty = req.difficulty if req.difficulty in ["easy", "medium", "hard"] else "medium"

    prompt = (
        f"Bạn là giảng viên IT cấp cao. Dựa trên tài liệu sau, hãy tạo đúng {count} câu hỏi trắc nghiệm "
        f"4 lựa chọn về {lang or 'chủ đề IT'}, độ khó: {difficulty}.\n"
        "Chỉ trả về định dạng JSON thuần (mảng các đối tượng). Mỗi đối tượng gồm:\n"
        "{\n"
        '  "question": "Nội dung câu hỏi rõ ràng, thực tế",\n'
        '  "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],\n'
        '  "answer_index": 0,\n'
        '  "explanation": "Giải thích chi tiết vì sao đáp án này đúng",\n'
        '  "difficulty": "easy" | "medium" | "hard"\n'
        "}\n\n"
        f"TÀI LIỆU HỌC TẬP:\n{context_str}"
    )

    generated_questions: List[Dict[str, Any]] = []
    via = "fallback_local"

    try:
        ai_resp = gemini_service.call_gemini(
            prompt=prompt,
            system_instruction="Bạn là trợ lý AI chuyên gia giáo dục kỹ thuật. Hãy luôn trả về JSON hợp lệ theo đúng cấu trúc yêu cầu.",
            json_mode=True,
            temperature=0.3
        )
        if ai_resp:
            parsed = json.loads(ai_resp)
            if isinstance(parsed, dict) and "questions" in parsed:
                parsed = parsed["questions"]
            if isinstance(parsed, list):
                valid_items = [
                    item for item in parsed
                    if isinstance(item, dict)
                    and item.get("question")
                    and isinstance(item.get("options"), list)
                    and len(item["options"]) >= 2
                ]
                if valid_items:
                    generated_questions = valid_items[:count]
                    via = "gemini"
    except Exception as e:
        logger.warning(f"AI Quiz Generation fallback due to: {e}")

    # Fallback to local intelligent questions generator if AI failed or unconfigured
    if not generated_questions:
        generated_questions = build_fallback_questions(
            material=context_str,
            count=count,
            language=lang or "IT",
            difficulty=difficulty
        )
        via = "fallback_local"

    user_id = getattr(current_user, "id", None) if (current_user and not hasattr(current_user, "dependency")) else None
    created = []

    for q_data in generated_questions:
        q_obj = QuizQuestion(
            course_id=valid_course_id,
            language=lang or "IT",
            question=str(q_data.get("question", "")).strip(),
            options=q_data.get("options", []),
            answer_index=int(q_data.get("answer_index", 0)),
            explanation=str(q_data.get("explanation", "")),
            difficulty=q_data.get("difficulty", difficulty) if q_data.get("difficulty") in ["easy", "medium", "hard"] else difficulty,
            source="ai",
            created_by=user_id
        )
        db.add(q_obj)
        db.flush()

        # Link with posts
        for p in posts:
            db.add(QuizQuestionPost(question_id=q_obj.id, post_id=p.id))

        opts = q_obj.options
        if isinstance(opts, str):
            try:
                opts = json.loads(opts)
            except Exception:
                opts = []

        created.append({
            "id": q_obj.id,
            "course_id": q_obj.course_id,
            "question": q_obj.question,
            "options": opts if isinstance(opts, list) else [],
            "answer_index": q_obj.answer_index,
            "explanation": q_obj.explanation or "",
            "difficulty": q_obj.difficulty,
            "language": q_obj.language or lang
        })

    db.commit()

    return {
        "ok": True,
        "via": via,
        "count": len(created),
        "created": created
    }


@router.post("/submit", response_model=QuizSubmitResponse)
def submit_quiz_answers(
    data: QuizSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Chấm điểm bài làm trắc nghiệm của học viên và trả về đáp án, giải thích chi tiết.
    """
    if not data.answers:
        return QuizSubmitResponse(
            total_questions=0,
            correct_count=0,
            score_percentage=0.0,
            details=[]
        )

    try:
        question_ids = [int(k) for k in data.answers.keys()]
    except (ValueError, TypeError):
        question_ids = []

    questions = db.query(QuizQuestion).filter(QuizQuestion.id.in_(question_ids)).all() if question_ids else []
    q_map = {q.id: q for q in questions}

    details: List[QuizSubmitDetail] = []
    correct_count = 0

    for qid, user_choice in data.answers.items():
        try:
            int_qid = int(qid)
        except (ValueError, TypeError):
            continue
        q = q_map.get(int_qid)
        if not q:
            continue

        is_correct = (user_choice == q.answer_index)
        if is_correct:
            correct_count += 1

        details.append(
            QuizSubmitDetail(
                question_id=q.id,
                is_correct=is_correct,
                selected_index=user_choice,
                correct_index=q.answer_index,
                explanation=q.explanation or ""
            )
        )

    total = len(details)
    score = round((correct_count / total) * 100, 1) if total > 0 else 0.0

    return QuizSubmitResponse(
        total_questions=total,
        correct_count=correct_count,
        score_percentage=score,
        details=details
    )
