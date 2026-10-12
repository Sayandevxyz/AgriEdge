"""
AgriEdge Advisory & Irrigation Endpoints
Generates multi-agent crop advisories, FAO-56 irrigation recommendations,
and stores historical advisory records.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import User, Advisory, Farm, Crop, SystemAuditLog, FarmerProfile
from apps.api.schemas import AdvisoryRequest
from apps.api.auth import get_current_user
from services.advisory.advisory_orchestrator import advisory_orchestrator

router = APIRouter(prefix="", tags=["Advisory & Irrigation"])


@router.post("/advisory/generate")
async def generate_advisory_endpoint(
    req: AdvisoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes the multi-agent decision flow:
    Weather -> ET0 -> Kc -> Water Triage -> Energy -> RAG Knowledge -> Advisory.
    """
    try:
        advisory_payload = await advisory_orchestrator.generate_advisory(
            crop=req.crop,
            planting_date=req.planting_date,
            farm_acres=req.farm_acres,
            soil_type=req.soil_type,
            irrigation_method=req.irrigation_method,
            pump_hp=req.pump_hp,
            pump_type=req.pump_type,
            discharge_lps=req.discharge_lps,
            latitude=req.latitude,
            longitude=req.longitude,
            farmer_query=req.farmer_query,
            language=req.language,
            stage_override=req.stage_override
        )

        # Find or create a crop reference to associate the advisory with the current user's farm
        profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        crop_record = None
        if profile:
            user_farm_ids = [f.id for f in db.query(Farm).filter(Farm.farmer_id == profile.id).all()]
            if user_farm_ids:
                crop_record = db.query(Crop).filter(
                    Crop.farm_id.in_(user_farm_ids),
                    Crop.crop_name.ilike(req.crop)
                ).first()
        if not crop_record:
            crop_record = db.query(Crop).filter(Crop.crop_name.ilike(req.crop)).first()
        crop_id = crop_record.id if crop_record else 1

        # Persist advisory in database
        db_advisory = Advisory(
            advisory_uuid=advisory_payload["advisory_id"],
            crop_id=crop_id,
            crop_name=req.crop,
            growth_stage=advisory_payload["crop_context"]["active_stage"],
            irrigation_action=advisory_payload["water"]["action"],
            urgency=advisory_payload["water"]["urgency"],
            estimated_water_litres=advisory_payload["water"]["estimated_gross_volume_litres"],
            potential_water_saved_litres=advisory_payload["water"]["potential_water_saved_litres"],
            estimated_energy_kwh=advisory_payload["energy"]["energy_consumed"],
            potential_energy_saved_kwh=advisory_payload["energy"]["potential_saved_energy"],
            estimated_cost_inr=advisory_payload["energy"]["estimated_cost_inr"],
            potential_cost_saved_inr=advisory_payload["energy"]["potential_saved_cost_inr"],
            disease_detected=advisory_payload["crop_health"]["detected"],
            disease_confidence=advisory_payload["crop_health"]["confidence"],
            disease_severity=advisory_payload["crop_health"]["severity"],
            summary=advisory_payload["summary"],
            why_rationale=advisory_payload["water"]["why"],
            treatment_recommendations=advisory_payload["treatment"],
            full_payload=advisory_payload
        )
        db.add(db_advisory)

        # Audit log for observability
        audit = SystemAuditLog(
            event_type="ADVISORY_GENERATION",
            agent_name="AdvisoryOrchestrator",
            request_id=advisory_payload["advisory_id"],
            duration_ms=advisory_payload["execution_metadata"]["total_duration_ms"],
            status="SUCCESS",
            details={"crop": req.crop, "acres": req.farm_acres}
        )
        db.add(audit)
        db.commit()

        return advisory_payload

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "ADVISORY_ORCHESTRATION_FAILED", "message": f"Advisory generation failed: {str(e)}"}
        )


@router.post("/irrigation/recommend")
async def recommend_irrigation_endpoint(
    req: AdvisoryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Dedicated endpoint for fast irrigation triage calculation without full foliar analysis.
    """
    advisory_payload = await advisory_orchestrator.generate_advisory(
        crop=req.crop,
        planting_date=req.planting_date,
        farm_acres=req.farm_acres,
        soil_type=req.soil_type,
        irrigation_method=req.irrigation_method,
        pump_hp=req.pump_hp,
        pump_type=req.pump_type,
        discharge_lps=req.discharge_lps,
        latitude=req.latitude,
        longitude=req.longitude,
        stage_override=req.stage_override
    )
    return {
        "irrigation_action": advisory_payload["water"]["action"],
        "urgency": advisory_payload["water"]["urgency"],
        "why": advisory_payload["water"]["why"],
        "water_metrics": advisory_payload["water"],
        "energy_metrics": advisory_payload["energy"],
        "weather_context": advisory_payload["weather_context"]
    }


@router.get("/advisories/{advisory_uuid}")
def get_advisory_by_uuid(
    advisory_uuid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves advisory details by advisory_uuid.
    Enforces strict farmer ownership: farmers may only access advisories associated with their own farms.
    """
    advisory = db.query(Advisory).filter(Advisory.advisory_uuid == advisory_uuid).first()
    if not advisory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ADVISORY_NOT_FOUND", "message": f"Advisory '{advisory_uuid}' not found."}
        )

    if current_user.role not in ["SYSTEM_ADMIN", "FPO_ADMIN"]:
        if advisory.crop:
            profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
            farm = db.query(Farm).filter(Farm.id == advisory.crop.farm_id).first()
            if farm and (not profile or farm.farmer_id != profile.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": "You do not have permission to view this advisory."}
                )

    return advisory.full_payload or {
        "advisory_id": advisory.advisory_uuid,
        "crop_name": advisory.crop_name,
        "growth_stage": advisory.growth_stage,
        "summary": advisory.summary,
        "water": {"action": advisory.irrigation_action}
    }

