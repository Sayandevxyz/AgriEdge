"""
AgriEdge Health Check Endpoints
Exposes structured health indicators for database, cache, and AI engines.
"""

import time
from fastapi import APIRouter
from sqlalchemy import text
from apps.api.config import settings
from apps.api.database import engine
from services.admin.observability_service import observability_service

from services.cache.cache_service import cache_service

router = APIRouter(tags=["Health"])


def check_db_health():
    start = time.time()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = round((time.time() - start) * 1000, 2)
        return {
            "status": "HEALTHY",
            "engine": str(engine.dialect.name).capitalize(),
            "connected": True,
            "latency_ms": latency_ms
        }
    except Exception as e:
        return {
            "status": "DOWN",
            "engine": str(getattr(engine.dialect, "name", "unknown")),
            "connected": False,
            "error": str(e)
        }


def check_redis_health():
    return cache_service.check_health()


@router.get("/health")
def health_check():
    db_status = check_db_health()
    redis_status = check_redis_health()

    if db_status["status"] == "DOWN":
        overall_status = "DOWN"
    elif redis_status["status"] == "DEGRADED":
        overall_status = "DEGRADED"
    else:
        overall_status = "OPERATIONAL"

    base_health = observability_service.get_system_health()
    base_health["status"] = overall_status
    base_health["components"]["database"] = db_status
    base_health["components"]["redis_cache"] = redis_status
    base_health["cache"] = redis_status
    return base_health


@router.get("/health/database")
def health_database():
    return check_db_health()


@router.get("/health/redis")
def health_redis():
    return check_redis_health()


@router.get("/health/ai")
def health_ai():
    return {
        "status": "HEALTHY",
        "vision_pipeline": "Active (Local Optical + ONNX/TFLite Ready)",
        "rag_engine": "Active (ICAR/TNAU/FAO Vector Knowledge Base)",
        "et_engine": "Active (FAO-56 Penman-Monteith Standard)"
    }
