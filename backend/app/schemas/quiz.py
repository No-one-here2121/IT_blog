from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime


class QuizQuestionBase(BaseModel):
    course_id: Optional[int] = None
    language: Optional[str] = ""
    question: str
    options: List[str]
    answer_index: int = 0
    explanation: Optional[str] = ""
    difficulty: Optional[str] = "medium"


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
