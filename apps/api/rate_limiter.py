"""
AgriEdge In-Memory Rate Limiter and Upload Size Enforcer
Protects sensitive auth, voice, vision, and simulation endpoints against abuse.
"""

import time
from collections import defaultdict
from threading import Lock
from typing import Optional
from fastapi import Request, HTTPException, status

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


class InMemoryRateLimiter:
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
        client_ip = request.client.host if request.client else "unknown"
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
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
