from pydantic import BaseModel, ConfigDict, model_validator
from typing import List, Optional, Dict, Any
from datetime import datetime


class QuizQuestionBase(BaseModel):
    course_id: Optional[int] = None
    language: Optional[str] = ""
    question: str
    options: List[str]
    answer_index: Optional[int] = 0
    correct_index: Optional[int] = None
    code_snippet: Optional[str] = None
    explanation: Optional[str] = ""
    difficulty: Optional[str] = "medium"

    @model_validator(mode="before")
    @classmethod
    def normalize_quiz_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Normalize answer_index from correct_index if provided
            if data.get("answer_index") is None:
                if data.get("correct_index") is not None:
                    data["answer_index"] = int(data["correct_index"])
                else:
                    data["answer_index"] = 0
            elif "correct_index" in data and data.get("correct_index") is not None and "answer_index" not in data:
                data["answer_index"] = int(data["correct_index"])

            diff_map = {
                "easy": "easy", "basic": "easy", "cơ bản": "easy", "co ban": "easy", "dễ": "easy", "de": "easy",
                "medium": "medium", "intermediate": "medium", "trung bình": "medium", "trung binh": "medium", "vừa": "medium", "vua": "medium",
                "hard": "hard", "advanced": "hard", "nâng cao": "hard", "nang cao": "hard", "khó": "hard", "kho": "hard"
            }
            if "difficulty" in data and data["difficulty"] is not None:
                raw_diff = str(data["difficulty"]).lower().strip()
                if raw_diff in diff_map:
                    data["difficulty"] = diff_map[raw_diff]
            else:
                data["difficulty"] = "medium"
        return data


class QuizQuestionCreate(QuizQuestionBase):
    post_ids: Optional[List[int]] = None


class QuizQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: Optional[int] = None
    language: str = ""
    question: str
    options: List[str]
    answer_index: int = 0
    explanation: Optional[str] = ""
    difficulty: str = "medium"
    source: str = "manual"
    created_by: Optional[int] = None
    created_at: datetime
    post_ids: List[int] = []


class QuizGenerateRequest(BaseModel):
    course_id: Optional[int] = None
    post_ids: Optional[List[int]] = None
    language: Optional[str] = ""
    count: int = 5
    difficulty: str = "mixed"  # easy, medium, hard, mixed


class QuizSubmitRequest(BaseModel):
    answers: Dict[int, int]  # { question_id: user_answer_index }


class QuizSubmitDetail(BaseModel):
    question_id: int
    is_correct: bool
    selected_index: int
    correct_index: int
    explanation: Optional[str] = ""


class QuizSubmitResponse(BaseModel):
    total_questions: int
    correct_count: int
    score_percentage: float
    details: List[QuizSubmitDetail]
