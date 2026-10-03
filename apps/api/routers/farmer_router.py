"""
AgriEdge Farmer & Farm Management Router
Handles farmer profile, onboarding, farm creation, farm details, and observation history.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import User, FarmerProfile, Farm, Crop, Advisory
from apps.api.schemas import FarmCreateRequest, FarmResponse
from apps.api.auth import get_current_user
from services.crop_stage.crop_stage_service import determine_crop_stage

router = APIRouter(prefix="", tags=["Farmer & Farms"])


@router.get("/farmer/profile")
def get_farmer_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    farms = db.query(Farm).filter(Farm.farmer_id == profile.id).all() if profile else []
    
    return {
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "language_preference": current_user.language_preference,
        "village": profile.village if profile else "Not Set",
        "district": profile.district if profile else "Not Set",
        "state": profile.state if profile else "Karnataka",
        "total_farms": len(farms),
        "data_mode": "Local Development (Judge Mode Enabled)"
    }


@router.get("/farms")
def list_farms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        return []
    
    farms = db.query(Farm).filter(Farm.farmer_id == profile.id).all()
    results = []
    for f in farms:
        active_crop = db.query(Crop).filter(Crop.farm_id == f.id, Crop.is_active == True).first()
        stage_info = None
        if active_crop:
            stage_info = determine_crop_stage(active_crop.crop_name, active_crop.planting_date)
        
        results.append({
            "id": f.id,
            "farm_name": f.farm_name,
            "total_area_acres": f.total_area_acres,
            "soil_type": f.soil_type,
            "irrigation_type": f.irrigation_type,
            "pump_hp": f.pump_hp,
            "pump_type": f.pump_type,
            "discharge_rate_lps": f.discharge_rate_lps,
            "village": f.village or profile.village,
            "district": f.district or profile.district,
            "latitude": f.latitude,
            "longitude": f.longitude,
            "active_crop": active_crop.crop_name if active_crop else "None",
            "variety": active_crop.variety if active_crop else "Standard",
            "planting_date": active_crop.planting_date if active_crop else "2026-08-20",
            "current_stage": stage_info["active_stage"] if stage_info else "vegetative"
        })
    return results


@router.post("/farms", status_code=status.HTTP_201_CREATED)
def create_farm(req: FarmCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        profile = FarmerProfile(
            user_id=current_user.id,
            village=req.village,
            district=req.district,
            state=req.state,
            latitude=req.latitude,
            longitude=req.longitude
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    farm = Farm(
        farmer_id=profile.id,
        farm_name=req.farm_name,
        total_area_acres=req.total_area_acres,
        soil_type=req.soil_type,
        irrigation_type=req.irrigation_type,
        pump_hp=req.pump_hp,
        pump_type=req.pump_type,
        discharge_rate_lps=req.discharge_rate_lps,
        village=req.village,
        district=req.district,
        latitude=req.latitude or 12.97,
        longitude=req.longitude or 77.59
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)

    crop = Crop(
        farm_id=farm.id,
        crop_name=req.crop_name,
        variety=req.variety,
        planting_date=req.planting_date,
        current_stage="seedling",
        is_active=True
    )
    db.add(crop)
    db.commit()
    db.refresh(crop)

    return {
        "success": True,
        "farm_id": farm.id,
        "farm_name": farm.farm_name,
        "crop_id": crop.id,
        "message": f"Farm '{farm.farm_name}' created successfully with {crop.crop_name}."
    }


@router.get("/farmer/history")
def get_advisory_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        return []
    
    farms = db.query(Farm).filter(Farm.farmer_id == profile.id).all()
    farm_ids = [f.id for f in farms]
    crops = db.query(Crop).filter(Crop.farm_id.in_(farm_ids)).all() if farm_ids else []
    crop_ids = [c.id for c in crops]
    
    advisories = db.query(Advisory).filter(Advisory.crop_id.in_(crop_ids)).order_by(Advisory.created_at.desc()).limit(20).all() if crop_ids else []
    
    return [
        {
            "id": a.id,
            "advisory_uuid": a.advisory_uuid,
            "crop_name": a.crop_name,
            "growth_stage": a.growth_stage,
            "irrigation_action": a.irrigation_action,
            "estimated_water_litres": a.estimated_water_litres,
            "potential_water_saved_litres": a.potential_water_saved_litres,
            "disease_detected": a.disease_detected,
            "summary": a.summary,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "Recent"
        }
        for a in advisories
    ]
