"""
AgriEdge In-Memory Rate Limiter and Upload Size Enforcer
Protects sensitive auth, voice, vision, and simulation endpoints against abuse.

Architecture & Scalability Note:
This in-memory rate limiter operates per-process using a thread-safe sliding window algorithm.
In multi-worker (e.g. uvicorn with multiple workers) or horizontally scaled multi-instance deployments,
each process maintains its own sliding window. The designated production upgrade path for cluster-wide
rate limiting is Redis-backed sliding window / token bucket (e.g., redis-py or slowapi backed by Redis)
configured via `settings.REDIS_URL`.
"""

import time
from collections import defaultdict
from threading import Lock
from typing import Optional
from fastapi import Request, HTTPException, status
from apps.api.config import settings

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def get_client_ip(request: Request, trusted_proxy_count: Optional[int] = None) -> str:
    """
    Extracts the real client IP by inspecting the X-Forwarded-For header.
    To prevent IP spoofing, it resolves the first untrusted hop from the right
    based on the configured TRUSTED_PROXY_COUNT.
    """
    if trusted_proxy_count is None:
        trusted_proxy_count = getattr(settings, "TRUSTED_PROXY_COUNT", 1)

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ips = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        if ips:
            # First untrusted hop from the right:
            # If ips = [client, untrusted_proxy, trusted_proxy] and trusted_proxy_count = 1:
            # len(ips) = 3 > 1 => ips[-1 - 1] = ips[-2]
            if len(ips) > trusted_proxy_count:
                return ips[-1 - trusted_proxy_count]
            return ips[0]

    return request.client.host if request.client else "unknown"


class InMemoryRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Operates per-process. Use Redis for multi-instance cluster synchronization.
    """
    def __init__(self):
        self._requests = defaultdict(list)
        self._lock = Lock()

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int = 60):
        now = time.time()
        with self._lock:
            timestamps = self._requests[key]
            cutoff = now - window_seconds
            valid = [t for t in timestamps if t > cutoff]
            if len(valid) >= max_requests:
                retry_after = max(1, int(valid[0] - cutoff) + 1)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds} seconds."
                    },
                    headers={"Retry-After": str(retry_after)}
                )
            valid.append(now)
            self._requests[key] = valid

    def reset(self):
        with self._lock:
            self._requests.clear()


limiter = InMemoryRateLimiter()


def rate_limit(max_requests: int = 60, window_seconds: int = 60, key_prefix: str = ""):
    def dependency(request: Request):
        client_ip = get_client_ip(request)
        key = f"{key_prefix}:{client_ip}"
        limiter.check_rate_limit(key, max_requests, window_seconds)
        return True
    return dependency


def validate_upload_size(content_length: Optional[int] = None, data: Optional[bytes] = None):
    if content_length is not None and content_length > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"Uploaded file exceeds maximum allowed size of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB."
            }
        )
    if data is not None and len(data) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"Uploaded file exceeds maximum allowed size of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB."
            }
        )
