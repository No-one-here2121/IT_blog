import os
import time
import threading
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class SlidingWindowRateLimiter:
    """Thread-safe sliding window rate limiter."""
    def __init__(self):
        self._lock = threading.Lock()
        self._records: Dict[str, List[float]] = {}

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> bool:
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            timestamps = self._records.get(key, [])
            # Purge timestamps outside current sliding window
            timestamps = [t for t in timestamps if t > window_start]

            if len(timestamps) >= max_requests:
                self._records[key] = timestamps
                return False

            timestamps.append(now)
            self._records[key] = timestamps
            return True

    def get_remaining(self, key: str, max_requests: int, window_seconds: int = 60) -> int:
        with self._lock:
            timestamps = self._records.get(key, [])
            window_start = time.time() - window_seconds
            timestamps = [t for t in timestamps if t > window_start]
            self._records[key] = timestamps
            return max(0, max_requests - len(timestamps))

    def reset(self):
        with self._lock:
            self._records.clear()


limiter = SlidingWindowRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI / Starlette Middleware for protecting API endpoints against abuse and DDoS (Section 16).
    Applies per-IP sliding window rate limiting with custom rules for sensitive routes.
    """
    def __init__(self, app, default_limit: int = 150, auth_ai_limit: int = 40, window_seconds: int = 60):
        super().__init__(app)
        self.default_limit = default_limit
        self.auth_ai_limit = auth_ai_limit
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next):
        # 0. Always permit CORS preflight OPTIONS requests without counting against rate limit
        if request.method == "OPTIONS":
            return await call_next(request)

        # 1. Skip static files, docs, healthchecks, openapi, websockets, and testing bypass
        path = request.url.path
        is_websocket = (
            request.scope.get("type") == "websocket"
            or request.headers.get("upgrade", "").lower() == "websocket"
            or path.endswith("/ws")
        )
        if (
            is_websocket
            or path.startswith("/uploads")
            or path.startswith("/docs")
            or path.startswith("/redoc")
            or path in ["/openapi.json", "/api/v1/openapi.json", "/health", "/api/v1/health", "/sitemap.xml", "/robots.txt", "/rss.xml", "/feed"]
            or request.headers.get("X-Test-Bypass-RateLimit") == "true"
            or "PYTEST_CURRENT_TEST" in os.environ
        ):
            return await call_next(request)

        # 2. Identify client key by IP or forwarded header
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not client_ip and request.client:
            client_ip = request.client.host
        if not client_ip:
            client_ip = "127.0.0.1"

        # 3. Choose limit based on route sensitivity
        is_sensitive = (
            "/auth/login" in path
            or "/auth/register" in path
            or "/auth/forgot-password" in path
            or "/ai/" in path
        )
        limit = self.auth_ai_limit if is_sensitive else self.default_limit
        key = f"{client_ip}:{path if is_sensitive else 'global'}"

        if not limiter.is_allowed(key=key, max_requests=limit, window_seconds=self.window_seconds):
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Bạn đã vượt quá giới hạn tần suất yêu cầu (Rate Limit). Vui lòng thử lại sau.",
                    "retry_after": self.window_seconds
                },
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0"
                }
            )

        response = await call_next(request)
        remaining = limiter.get_remaining(key, limit, self.window_seconds)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
