from typing import Optional, List
from pydantic import BaseModel


class CodeExplainRequest(BaseModel):
    code_snippet: str
    language: Optional[str] = "python"
    context_title: Optional[str] = None
    action: Optional[str] = "explain"  # "explain", "debug", "optimize", "refactor"


class CodeExplainResponse(BaseModel):
    action: str
    language: str
    explanation: str
    improved_code: Optional[str] = None
    key_takeaways: List[str] = []


class ArticleAskRequest(BaseModel):
    post_id: int
    question: str
    selected_text: Optional[str] = None


class ArticleAskResponse(BaseModel):
    post_id: int
    question: str
    answer: str
    reference_context: Optional[str] = None


class ArticleSummarizeRequest(BaseModel):
    post_id: int


class ArticleSummarizeResponse(BaseModel):
    post_id: int
    summary: str
    key_points: List[str] = []


class AIModerationRequest(BaseModel):
    title: str
    content: str


class AIModerationResponse(BaseModel):
    is_safe: bool
    spam_score: float
    toxicity_score: float
    is_tech_related: bool
    quality_score: float
    verdict: str  # "approved", "flagged", "rejected"
    reasons: List[str] = []


class AIOptimizeRequest(BaseModel):
    title: str
    content: str


class AIOptimizeResponse(BaseModel):
    suggested_titles: List[str] = []
    seo_title: str
    meta_description: str
    suggested_tags: List[str] = []
    suggested_category: str


class GeminiKeyStatus(BaseModel):
    masked_key: str
    status: str
    request_count: int
    success_count: int
    failure_count: int
    last_used_at: Optional[str] = None
    last_error: Optional[str] = None
    is_available: bool


class GeminiKeyPoolResponse(BaseModel):
    model: str
    total_keys: int
    active_keys: int
    keys: List[GeminiKeyStatus]


class GeminiKeyUpdateRequest(BaseModel):
    keys: List[str]


class GeminiKeyTestRequest(BaseModel):
    key: str


class GeminiKeyTestResponse(BaseModel):
    valid: bool
    message: str
    rate_limited: Optional[bool] = False
