import os
import json
import logging
import random
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

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


def get_topics_metadata() -> List[Dict[str, Any]]:
    if os.path.exists(_TOPICS_FILE):
        try:
            with open(_TOPICS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading quiz_topics.json: {e}")
    return []


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
            cnt = sum(c for lang, c in counts.items() if t_id.lower() in (lang or "").lower())
        topics.append({
            **item,
            "question_count": cnt
        })
    return topics


@router.get("/questions", response_model=Dict[str, List[QuizQuestionResponse]])
def get_quiz_questions(
    course_id: Optional[int] = Query(None, description="L?c theo ID kh?a h?c"),
    post_id: Optional[int] = Query(None, description="L?c theo ID b?i vi?t"),
    language: Optional[str] = Query(None, description="L?c theo ng?n ng? l?p tr?nh / c?ng ngh?"),
    difficulty: Optional[str] = Query(None, description="L?c theo ?? kh? (easy, medium, hard)"),
    limit: int = Query(50, ge=1, le=500, description="Gi?i h?n s? l??ng c?u h?i"),
    randomize: bool = Query(False, description="X?o tr?n th? t? c?u h?i ng?u nhi?n"),
    db: Session = Depends(get_db)
):
    """
    L?y danh s?ch c?u h?i tr?c nghi?m t? ng?n h?ng ?? thi.
    H? tr? l?c theo Kh?a h?c, B?i vi?t li?n quan, Ng?n ng?, ho?c ?? kh?, k?m t?nh n?ng l?y ng?u nhi?n v? ch?n s? l??ng c?u h?i.
    """
    query = db.query(QuizQuestion)

    if post_id is not None:
        query = query.join(QuizQuestionPost, QuizQuestionPost.question_id == QuizQuestion.id)\
                     .filter(QuizQuestionPost.post_id == post_id)
    elif course_id is not None:
        query = query.filter(QuizQuestion.course_id == course_id)

    if language and language.strip().lower() not in ["all", "t?t c?", "tat ca"]:
        query = query.filter(QuizQuestion.language.ilike(f"%{language.strip()}%"))

    if difficulty and difficulty != "mixed":
        query = query.filter(QuizQuestion.difficulty == difficulty.lower().strip())

    # L?y danh s?ch ng?u nhi?n ho?c theo th? t?
    if randomize:
        items = query.order_by(func.random()).limit(limit).all()
    else:
        items = query.order_by(QuizQuestion.id.asc()).limit(limit).all()

    # N?u ch?a c? c?u h?i n?o theo filter v? kh?ng ch? ??nh post_id/course_id, l?y c?u h?i chung
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
    Thêm mới thủ công 1 câu hỏi trắc nghiệm vào ngân hàng đề thi.
    """
    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Nội dung câu hỏi không được để trống.")
    clean_options = [opt.strip() for opt in data.options if isinstance(opt, str) and opt.strip()]
    if len(clean_options) < 2:
        raise HTTPException(status_code=400, detail="Câu hỏi phải có ít nhất 2 phương án lựa chọn không rỗng.")
    if data.answer_index < 0 or data.answer_index >= len(clean_options):
        raise HTTPException(status_code=400, detail="Chỉ số đáp án đúng (answer_index) không hợp lệ.")

    clean_diff = data.difficulty.lower().strip() if data.difficulty else "medium"
    if clean_diff not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Độ khó câu hỏi không hợp lệ. Cho phép: easy, medium, hard.")

    if data.course_id:
        course = db.query(Course).filter(Course.id == data.course_id).first()
        if not course:
            raise HTTPException(status_code=400, detail="Khóa học được chỉ định không tồn tại.")

    user_id = current_user.id if current_user else None

    question = QuizQuestion(
        course_id=data.course_id,
        language=data.language or "",
        question=data.question.strip(),
        options=clean_options,
        answer_index=data.answer_index,
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
        "message": "Tạo câu hỏi trắc nghiệm thành công.",
        "question_id": question.id
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

    user_id = current_user.id if current_user else None
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
