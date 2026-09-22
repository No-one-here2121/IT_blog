from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.models.base import Base
from app.api.v1 import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup if not already created
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Database auto-init skipped or failed: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Rate Limiting Middleware (Section 16)
from app.core.rate_limiter import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware, default_limit=200, auth_ai_limit=60, window_seconds=60)


import os
from fastapi.staticfiles import StaticFiles
from app.api.v1.seo import get_sitemap_xml, get_robots_txt, get_rss_feed

# Ensure uploads directory exists
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Root-level SEO routes for search crawlers
app.add_api_route("/sitemap.xml", get_sitemap_xml, methods=["GET"], include_in_schema=False)
app.add_api_route("/robots.txt", get_robots_txt, methods=["GET"], include_in_schema=False)
app.add_api_route("/rss.xml", get_rss_feed, methods=["GET"], include_in_schema=False)
app.add_api_route("/feed", get_rss_feed, methods=["GET"], include_in_schema=False)


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def health_check():
    """Service healthcheck status endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": "development"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
