"""
AgriEdge High-Performance Multi-Tier Cache Service
Supports Redis with automatic fallback to in-memory dictionary caching with TTL.
Used for caching weather forecasts, regional mandi prices, and geocoding lookups.
"""

import time
import json
from typing import Optional, Any, Dict

try:
    import redis
except ImportError:
    redis = None

from apps.api.config import settings


class CacheService:
    def __init__(self):
        self._memory_cache: Dict[str, tuple[float, Any]] = {}
        self._redis_client = None
        self._redis_checked = False
        self._redis_available = False

    def _get_redis(self):
        if redis is None:
            return None
        if not self._redis_checked or self._redis_client is None:
            try:
                self._redis_client = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=0.5,
                    socket_timeout=0.5
                )
                self._redis_client.ping()
                self._redis_available = True
            except Exception:
                self._redis_available = False
            self._redis_checked = True
        return self._redis_client if self._redis_available else None

    def get(self, key: str) -> Optional[Any]:
        # 1. Try Redis
        client = self._get_redis()
        if client:
            try:
                val = client.get(key)
                if val is not None:
                    try:
                        return json.loads(val)
                    except Exception:
                        return val
            except Exception:
                self._redis_available = False

        # 2. In-Memory fallback
        now = time.time()
        if key in self._memory_cache:
            ts, data = self._memory_cache[key]
            if now < ts:
                return data
            else:
                del self._memory_cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 900) -> bool:
        serialized = json.dumps(value) if not isinstance(value, str) else value
        # 1. Try Redis
        client = self._get_redis()
        if client:
            try:
                client.set(key, serialized, ex=ttl_seconds)
            except Exception:
                self._redis_available = False

        # 2. Always maintain in memory as fallback
        self._memory_cache[key] = (time.time() + ttl_seconds, value)
        return True

    def delete(self, key: str) -> bool:
        client = self._get_redis()
        if client:
            try:
                client.delete(key)
            except Exception:
                pass
        self._memory_cache.pop(key, None)
        return True

    def check_health(self) -> Dict[str, Any]:
        """
        Determines the true operational state of the cache tier.
        """
        if redis is None:
            return {
                "status": "DEGRADED",
                "cache_tier": "In-Memory Fallback Active",
                "backend": "memory",
                "connected": False,
                "detail": "redis library not installed"
            }
        try:
            client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=0.5
            )
            client.ping()
            self._redis_available = True
            return {
                "status": "HEALTHY",
                "cache_tier": "Redis (Live)",
                "backend": "redis",
                "connected": True,
                "url": settings.REDIS_URL.split("@")[-1]
            }
        except Exception as e:
            self._redis_available = False
            return {
                "status": "DEGRADED",
                "cache_tier": "In-Memory Fallback Active (Redis disconnected)",
                "backend": "memory",
                "connected": False,
                "detail": f"Redis unreachable ({type(e).__name__}); active in-memory cache"
            }


cache_service = CacheService()
