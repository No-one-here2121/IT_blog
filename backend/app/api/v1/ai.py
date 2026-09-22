from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.post import Post, PostStatus
from app.models.user import User
from app.api.deps import get_current_active_user, get_current_user_optional
from app.services.gemini_service import gemini_service
from app.schemas.ai import (
    CodeExplainRequest,
    CodeExplainResponse,
    ArticleAskRequest,
    ArticleAskResponse,
    ArticleSummarizeRequest,
    ArticleSummarizeResponse,
    AIModerationRequest,
    AIModerationResponse,
    AIOptimizeRequest,
    AIOptimizeResponse,
    GeminiKeyPoolResponse,
    GeminiKeyUpdateRequest,
    GeminiKeyTestRequest,
    GeminiKeyTestResponse,
    GeminiKeyStatus
)

router = APIRouter(prefix="/ai", tags=["AI Assistant & Gemini Moderation"])


@router.post("/explain-code", response_model=CodeExplainResponse)
def explain_code(req: CodeExplainRequest):
    """
    Context-aware code assistant: Explain, Debug, Optimize, or Refactor code snippets using Gemini AI.
    """
    snippet = req.code_snippet.strip()
    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đoạn mã (code snippet) không được để trống."
        )

    lang = (req.language or "python").lower()
    action = (req.action or "explain").lower()

    result = gemini_service.explain_code(snippet, lang, action)
    return CodeExplainResponse(
        action=result.get("action", action),
        language=result.get("language", lang),
        explanation=result.get("explanation", ""),
        improved_code=result.get("improved_code", snippet),
        key_takeaways=result.get("key_takeaways", [])
    )


@router.post("/ask-article", response_model=ArticleAskResponse)
def ask_article(
    req: ArticleAskRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Context-aware Q&A based on the content of a specific IT blog article using Gemini AI.
    """
    clean_question = req.question.strip()
    if not clean_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Câu hỏi không được để trống."
        )

    post = db.query(Post).filter(Post.id == req.post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài viết không tồn tại")

    now = datetime.now(timezone.utc)
    is_author_or_admin = current_user and (
        current_user.id == post.author_id or
        current_user.is_superuser or
        any(r.name in ["admin", "moderator"] for r in current_user.roles)
    )

    sched = post.scheduled_at
    if sched and sched.tzinfo is None:
        sched = sched.replace(tzinfo=timezone.utc)

    is_published = (
        post.status == PostStatus.APPROVED.value and
        (sched is None or sched <= now)
    )

    if not is_published and not is_author_or_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài viết không tồn tại")

    answer = gemini_service.ask_article(
        article_title=post.title,
        article_content=post.content,
        question=clean_question,
        context=req.selected_text
    )

    return ArticleAskResponse(
        post_id=post.id,
        question=req.question,
        answer=answer,
        reference_context=(req.selected_text or post.excerpt or post.content[:200])[:300]
    )


@router.post("/summarize", response_model=ArticleSummarizeResponse)
def summarize_article(
    req: ArticleSummarizeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    AI quick summary for an article into core key takeaways using Gemini AI.
    """
    post = db.query(Post).filter(Post.id == req.post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài viết không tồn tại")

    now = datetime.now(timezone.utc)
    is_author_or_admin = current_user and (
        current_user.id == post.author_id or
        current_user.is_superuser or
        any(r.name in ["admin", "moderator"] for r in current_user.roles)
    )

    sched = post.scheduled_at
    if sched and sched.tzinfo is None:
        sched = sched.replace(tzinfo=timezone.utc)

    is_published = (
        post.status == PostStatus.APPROVED.value and
        (sched is None or sched <= now)
    )

    if not is_published and not is_author_or_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài viết không tồn tại")

    result = gemini_service.summarize_article(post.title, post.content)
    return ArticleSummarizeResponse(
        post_id=post.id,
        summary=result.get("summary", ""),
        key_points=result.get("key_points", [])
    )


@router.post("/moderate", response_model=AIModerationResponse)
def moderate_content(req: AIModerationRequest):
    """
    AI Content Moderation: Automated filter for spam, toxicity, and IT topic relevance via Google Gemini AI.
    """
    result = gemini_service.moderate_content(req.title, req.content)
    return AIModerationResponse(
        is_safe=result.get("is_safe", True),
        spam_score=result.get("spam_score", 0.05),
        toxicity_score=result.get("toxicity_score", 0.05),
        is_tech_related=result.get("is_tech_related", True),
        quality_score=result.get("quality_score", 0.8),
        verdict=result.get("verdict", "approved"),
        reasons=result.get("reasons", [])
    )


@router.post("/optimize-post", response_model=AIOptimizeResponse)
def optimize_post(req: AIOptimizeRequest):
    """
    AI Post Optimizer: Generate engaging titles, SEO metadata, and tag suggestions via Google Gemini AI.
    """
    result = gemini_service.optimize_post(req.title, req.content)
    return AIOptimizeResponse(
        suggested_titles=result.get("suggested_titles", []),
        seo_title=result.get("seo_title", f"{req.title[:50]} | IT Blog"),
        meta_description=result.get("meta_description", req.content[:150]),
        suggested_tags=result.get("suggested_tags", ["IT", "Coding"]),
        suggested_category=result.get("suggested_category", "Backend")
    )


# =============================================================================
# Google Gemini Multi-Key Management Endpoints
# =============================================================================

@router.get("/keys", response_model=GeminiKeyPoolResponse)
def get_gemini_keys_status():
    """
    View status of configured Gemini API keys (masked for security), usage counts, and availability.
    """
    keys_status = [GeminiKeyStatus(**k) for k in gemini_service.get_keys_status()]
    active_count = sum(1 for k in keys_status if k.is_available)
    return GeminiKeyPoolResponse(
        model=gemini_service.model,
        total_keys=len(keys_status),
        active_keys=active_count,
        keys=keys_status
    )


@router.post("/keys", response_model=GeminiKeyPoolResponse)
def update_gemini_keys(
    req: GeminiKeyUpdateRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update the active pool of Gemini API keys (supports pasting a list of keys).
    Requires active user authentication.
    """
    clean_keys = [k.strip() for k in req.keys if k and k.strip()]
    gemini_service.set_keys(clean_keys)

    keys_status = [GeminiKeyStatus(**k) for k in gemini_service.get_keys_status()]
    active_count = sum(1 for k in keys_status if k.is_available)
    return GeminiKeyPoolResponse(
        model=gemini_service.model,
        total_keys=len(keys_status),
        active_keys=active_count,
        keys=keys_status
    )


@router.post("/keys/test", response_model=GeminiKeyTestResponse)
def test_gemini_key(req: GeminiKeyTestRequest):
    """
    Test connectivity and quota for a specific Gemini API key.
    """
    result = gemini_service.test_key(req.key)
    return GeminiKeyTestResponse(
        valid=result.get("valid", False),
        message=result.get("message", "Đã kiểm tra khóa API"),
        rate_limited=result.get("rate_limited", False)
    )
