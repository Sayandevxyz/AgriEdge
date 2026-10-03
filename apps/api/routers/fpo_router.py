"""
AgriEdge FPO Intelligence Router
Provides aggregated farmer metrics, water and energy trend telemetry,
and privacy-preserved village-level disease hotspot clusters.
"""

from typing import Optional
from fastapi import APIRouter, Query, Depends
from apps.api.models import User
from apps.api.auth import get_current_user, require_roles
from services.fpo.fpo_service import fpo_service

router = APIRouter(prefix="/fpo", tags=["FPO Intelligence"])


@router.get("/dashboard")
def get_fpo_dashboard_metrics(
    fpo_id: Optional[str] = "fpo_ka_01"
):
    return fpo_service.get_dashboard_overview(fpo_id=fpo_id)


@router.get("/disease-map")
def get_fpo_disease_hotspots(
    crop: Optional[str] = Query(None, description="Filter by crop name"),
    severity: Optional[str] = Query(None, description="Filter by severity")
):
    return fpo_service.get_disease_hotspots(crop_filter=crop, severity_filter=severity)


@router.get("/water")
def get_fpo_water_analytics():
    overview = fpo_service.get_dashboard_overview()
    return {
        "kpi": {
            "total_water_saved_litres": overview["kpi_metrics"]["estimated_water_saved_litres"],
            "adherence_rate": overview["kpi_metrics"]["advisory_adherence_rate_pct"]
        },
        "water_trends_7d": overview["water_trends_7d"],
        "unit": "kiloLitres (kL)"
    }


@router.get("/energy")
def get_fpo_energy_analytics():
    overview = fpo_service.get_dashboard_overview()
    return {
        "kpi": {
            "total_energy_saved_kwh": overview["kpi_metrics"]["estimated_energy_saved_kwh"],
            "total_cost_saved_inr": overview["kpi_metrics"]["estimated_cost_saved_inr"]
        },
        "energy_trends_7d": overview["energy_trends_7d"],
        "unit": "kWh"
    }
