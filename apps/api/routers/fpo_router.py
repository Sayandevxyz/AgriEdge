"""
AgriEdge FPO Intelligence Router
Provides aggregated farmer metrics, water and energy trend telemetry,
and privacy-preserved district-level disease hotspot clusters.
"""

from typing import Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from apps.api.models import User
from apps.api.auth import get_current_user, require_roles
from apps.api.database import get_db
from services.fpo.fpo_service import fpo_service

router = APIRouter(
    prefix="/fpo",
    tags=["FPO Intelligence"],
    dependencies=[Depends(require_roles("FPO_ADMIN", "SYSTEM_ADMIN"))]
)


@router.get("/dashboard")
def get_fpo_dashboard_metrics(
    fpo_id: Optional[str] = "fpo_ka_01",
    demo: Optional[bool] = Query(None, description="Force demo data"),
    db: Session = Depends(get_db)
):
    return fpo_service.get_dashboard_overview(db=db, fpo_id=fpo_id, demo=demo)


@router.get("/disease-map")
def get_fpo_disease_hotspots(
    crop: Optional[str] = Query(None, description="Filter by crop name"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    demo: Optional[bool] = Query(None, description="Force demo data"),
    db: Session = Depends(get_db)
):
    return fpo_service.get_disease_hotspots(db=db, crop_filter=crop, severity_filter=severity, demo=demo)


@router.get("/water")
def get_fpo_water_analytics(
    demo: Optional[bool] = Query(None, description="Force demo data"),
    db: Session = Depends(get_db)
):
    overview = fpo_service.get_dashboard_overview(db=db, demo=demo)
    return {
        "kpi": {
            "total_water_saved_litres": overview["kpi_metrics"]["estimated_water_saved_litres"],
            "adherence_rate": overview["kpi_metrics"]["advisory_adherence_rate_pct"]
        },
        "water_trends_7d": overview["water_trends_7d"],
        "unit": "kiloLitres (kL)",
        "is_demo": overview.get("is_demo", False),
        "empty_state": overview.get("empty_state", False)
    }


@router.get("/energy")
def get_fpo_energy_analytics(
    demo: Optional[bool] = Query(None, description="Force demo data"),
    db: Session = Depends(get_db)
):
    overview = fpo_service.get_dashboard_overview(db=db, demo=demo)
    return {
        "kpi": {
            "total_energy_saved_kwh": overview["kpi_metrics"]["estimated_energy_saved_kwh"],
            "total_cost_saved_inr": overview["kpi_metrics"]["estimated_cost_saved_inr"]
        },
        "energy_trends_7d": overview["energy_trends_7d"],
        "unit": "kWh",
        "is_demo": overview.get("is_demo", False),
        "empty_state": overview.get("empty_state", False)
    }
