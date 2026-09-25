from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.posts import router as posts_router
from app.api.v1.categories import router as categories_router
from app.api.v1.tags import router as tags_router
from app.api.v1.comments import router as comments_router
from app.api.v1.interactions import router as interactions_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.feeds import router as feeds_router
from app.api.v1.search import router as search_router
from app.api.v1.moderation import router as moderation_router
from app.api.v1.ai import router as ai_router
from app.api.v1.roadmaps import router as roadmaps_router
from app.api.v1.gamification import router as gamification_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.events import router as events_router
from app.api.v1.crawler import router as crawler_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.courses import router as courses_router
from app.api.v1.ads import router as ads_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.seo import router as seo_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.quiz import router as quiz_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(posts_router)
api_router.include_router(categories_router)
api_router.include_router(tags_router)
api_router.include_router(comments_router)
api_router.include_router(interactions_router)
api_router.include_router(notifications_router)
api_router.include_router(feeds_router)
api_router.include_router(search_router)
api_router.include_router(moderation_router)
api_router.include_router(ai_router)
api_router.include_router(roadmaps_router)
api_router.include_router(gamification_router)
api_router.include_router(jobs_router)
api_router.include_router(events_router)
api_router.include_router(crawler_router)
api_router.include_router(recommendations_router)
api_router.include_router(courses_router)
api_router.include_router(ads_router)
api_router.include_router(analytics_router)
api_router.include_router(seo_router)
api_router.include_router(uploads_router)
api_router.include_router(quiz_router, prefix="/quiz")

from app.api.v1.gamification import get_leaderboard
from app.schemas.gamification import LeaderboardUserResponse
from typing import List
from fastapi import Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db

@api_router.get('/leaderboard', response_model=List[LeaderboardUserResponse], tags=['Gamification'])
def get_leaderboard_direct(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    return get_leaderboard(limit=limit, db=db)
