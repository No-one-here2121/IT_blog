from typing import Optional
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

# Configure CORS for React frontend (support any localhost / 127.0.0.1 port like 5173, 5174, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
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





from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.models.user import User, Role
from app.schemas.user import UserResponse
import secrets
import httpx
import re
import json

oauth_callback_router = APIRouter(tags=["OAuth Callbacks"])

@oauth_callback_router.get("/auth/google/callback")
@oauth_callback_router.get("/api/v1/auth/google/callback")
@oauth_callback_router.get("/api/v1/auth/oauth/google/callback")
async def google_oauth_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handles the Google OAuth redirect callback from accounts.google.com.
    Exchanges code for tokens, synchronizes user in DB, and directly redirects to frontend with JWT tokens.
    """
    target_frontend = state.rstrip('/') if (state and state.startswith('http')) else settings.FRONTEND_URL.rstrip('/')

    if error or not code:
        err_msg = error or "Authorization code was not provided."
        return RedirectResponse(url=f"{target_frontend}/login?error={err_msg}", status_code=302)

    # 1. Exchange authorization code with Google for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": "http://localhost:8000/auth/google/callback"
    }

    resolved_email = None
    resolved_name = None
    resolved_avatar = None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(token_url, data=token_data)
            if resp.status_code != 200:
                print(f"Google token exchange failed: {resp.status_code} {resp.text}")
                return RedirectResponse(url=f"{target_frontend}/login?error=GoogleTokenExchangeFailed", status_code=302)

            token_res = resp.json()
            access_tok = token_res.get("access_token")

            # 2. Fetch User Profile from Google
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_tok}"}
            )
            if userinfo_resp.status_code == 200:
                userinfo = userinfo_resp.json()
                resolved_email = (userinfo.get("email") or "").lower().strip()
                resolved_name = userinfo.get("name") or resolved_email.split("@")[0]
                resolved_avatar = userinfo.get("picture")

    except Exception as e:
        print(f"Google OAuth connection error: {e}")
        return RedirectResponse(url=f"{target_frontend}/login?error=GoogleConnectionError", status_code=302)

    if not resolved_email:
        return RedirectResponse(url=f"{target_frontend}/login?error=NoEmailFromGoogle", status_code=302)

    # 3. Synchronize User in Database (Auto register if new, or log in if existing)
    user = db.query(User).filter(User.email == resolved_email).first()
    if not user:
        clean_base = re.sub(r"[^a-zA-Z0-9_.-]", "", resolved_email.split("@")[0]).lower()
        if len(clean_base) < 3:
            clean_base = f"google_{clean_base}"
        unique_username = clean_base
        idx = 1
        while db.query(User).filter(User.username == unique_username).first():
            unique_username = f"{clean_base}_{idx}"
            idx += 1

        user = User(
            email=resolved_email,
            username=unique_username,
            name=resolved_name or unique_username,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            avatar=resolved_avatar or f"https://api.dicebear.com/7.x/bottts/svg?seed={unique_username}",
            is_active=True
        )
        default_role = db.query(Role).filter(Role.name == "user").first()
        if not default_role:
            default_role = Role(name="user", description="Thành viên tiêu chuẩn")
            db.add(default_role)
            db.flush()
        user.roles.append(default_role)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.avatar and resolved_avatar:
            user.avatar = resolved_avatar
        user.is_active = True
        db.commit()
        db.refresh(user)

    # 4. Generate Real JWT Tokens
    jwt_access = create_access_token(subject=user.id)
    jwt_refresh = create_refresh_token(subject=user.id)

    # 5. Direct HTTP 302 Redirect to Frontend carrying JWT tokens in URL
    redirect_url = f"{target_frontend}/?auth_token={jwt_access}&refresh_token={jwt_refresh}&oauth_success=true"
    return RedirectResponse(url=redirect_url, status_code=302)


@oauth_callback_router.get("/auth/github/callback")
@oauth_callback_router.get("/api/v1/auth/github/callback")
async def github_oauth_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handles the GitHub OAuth redirect callback.
    """
    target_frontend = state.rstrip('/') if (state and state.startswith('http')) else settings.FRONTEND_URL.rstrip('/')

    if error or not code:
        return RedirectResponse(url=f"{target_frontend}/login?error=GitHubAuthCancelled", status_code=302)

    resolved_email = None
    resolved_name = None
    resolved_avatar = None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID or "Iv1.b507a6f87d4efb63",
                    "client_secret": settings.GITHUB_CLIENT_SECRET or "",
                    "code": code
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_resp.json()
            gh_access_token = token_data.get("access_token")
            if not gh_access_token:
                return RedirectResponse(url=f"{target_frontend}/login?error=GitHubTokenFailed", status_code=302)

            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {gh_access_token}", "Accept": "application/json"}
            )
            if user_resp.status_code == 200:
                gh_user = user_resp.json()
                resolved_name = gh_user.get("name") or gh_user.get("login")
                resolved_avatar = gh_user.get("avatar_url")
                resolved_email = gh_user.get("email")

                if not resolved_email:
                    emails_resp = await client.get(
                        "https://api.github.com/user/emails",
                        headers={"Authorization": f"Bearer {gh_access_token}", "Accept": "application/json"}
                    )
                    if emails_resp.status_code == 200:
                        emails_list = emails_resp.json()
                        primary = next((e["email"] for e in emails_list if e.get("primary")), None)
                        if primary:
                            resolved_email = primary
                        elif emails_list:
                            resolved_email = emails_list[0].get("email")

    except Exception as e:
        print(f"GitHub OAuth error: {e}")
        return RedirectResponse(url=f"{target_frontend}/login?error=GitHubConnectionError", status_code=302)

    if not resolved_email:
        return RedirectResponse(url=f"{target_frontend}/login?error=NoEmailFromGitHub", status_code=302)

    resolved_email = resolved_email.lower().strip()
    user = db.query(User).filter(User.email == resolved_email).first()
    if not user:
        clean_base = re.sub(r"[^a-zA-Z0-9_.-]", "", resolved_email.split("@")[0]).lower()
        if len(clean_base) < 3:
            clean_base = f"gh_{clean_base}"
        unique_username = clean_base
        idx = 1
        while db.query(User).filter(User.username == unique_username).first():
            unique_username = f"{clean_base}_{idx}"
            idx += 1

        user = User(
            email=resolved_email,
            username=unique_username,
            name=resolved_name or unique_username,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            avatar=resolved_avatar or f"https://api.dicebear.com/7.x/bottts/svg?seed={unique_username}",
            is_active=True
        )
        default_role = db.query(Role).filter(Role.name == "user").first()
        if not default_role:
            default_role = Role(name="user", description="Thành viên tiêu chuẩn")
            db.add(default_role)
            db.flush()
        user.roles.append(default_role)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.avatar and resolved_avatar:
            user.avatar = resolved_avatar
        user.is_active = True
        db.commit()
        db.refresh(user)

    jwt_access = create_access_token(subject=user.id)
    jwt_refresh = create_refresh_token(subject=user.id)
    redirect_url = f"{target_frontend}/?auth_token={jwt_access}&refresh_token={jwt_refresh}&oauth_success=true"
    return RedirectResponse(url=redirect_url, status_code=302)


app.include_router(oauth_callback_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
