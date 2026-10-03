"""
AgriEdge Admin & System Observability Router
Exposes system telemetry, agent execution logs, token and cost monitoring,
and subsystem operational states.
"""

from fastapi import APIRouter, Depends
from apps.api.models import User
from apps.api.auth import get_current_user, require_roles
from services.admin.observability_service import observability_service

router = APIRouter(prefix="/admin", tags=["Admin & System"])


@router.get("/system")
def get_system_overview():
    return {
        "health": observability_service.get_system_health(),
        "observability": observability_service.get_system_metrics()
    }


@router.get("/logs")
def get_agent_logs():
    return observability_service.get_system_metrics()["recent_agent_logs"]


@router.get("/api-usage")
def get_api_usage():
    metrics = observability_service.get_system_metrics()["metrics"]
    return {
        "total_requests": metrics["total_requests"],
        "successful_advisories": metrics["successful_advisories"],
        "failed_requests": metrics["failed_requests"],
        "ai_tokens": metrics["total_ai_tokens"],
        "costs": metrics["cost_breakdown"]
    }
