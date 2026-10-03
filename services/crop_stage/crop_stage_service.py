"""
AgriEdge Crop Stage Determination & Phenological Tracking Service
Determines current phenological stage based on planting date, growing degree days (GDD),
or days elapsed since sowing. Supports agronomist/farmer manual overrides.
"""

from datetime import datetime, date
from typing import Dict, Any, Optional
from services.irrigation.et_engine import CROP_KC_DATABASE


def determine_crop_stage(
    crop_name: str,
    planting_date_str: str,
    variety: Optional[str] = None,
    stage_override: Optional[str] = None,
    current_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Computes elapsed days and assigns one of:
    seedling, vegetative, flowering, fruiting, maturity.
    """
    crop_key = crop_name.lower().strip()
    crop_info = CROP_KC_DATABASE.get(crop_key, CROP_KC_DATABASE["tomato"])
    stage_days = crop_info["stage_days"]

    if current_date is None:
        current_date = date.today()

    # Parse planting date
    try:
        p_date = datetime.strptime(planting_date_str, "%Y-%m-%d").date()
        days_elapsed = max(0, (current_date - p_date).days)
    except Exception:
        days_elapsed = 40  # Reasonable default if parsing fails

    # Determine automatic stage
    cum_days = 0
    auto_stage = "maturity"
    stage_progress = 100

    stages_order = ["seedling", "vegetative", "flowering", "fruiting", "maturity"]
    for stg in stages_order:
        duration = stage_days.get(stg, 30)
        if days_elapsed <= cum_days + duration:
            auto_stage = stg
            stage_elapsed = days_elapsed - cum_days
            stage_progress = round((stage_elapsed / duration) * 100, 1)
            break
        cum_days += duration

    # Handle manual override
    is_overridden = bool(stage_override and stage_override.lower().strip() in stages_order)
    final_stage = stage_override.lower().strip() if is_overridden else auto_stage

    # Stage descriptions and water sensitivity
    sensitivity_map = {
        "seedling": "High sensitivity to soil crusting and desiccation; low volumetric demand.",
        "vegetative": "Moderate water sensitivity; rapid leaf area expansion.",
        "flowering": "CRITICAL stage: moisture stress causes blossom drop and severe yield loss.",
        "fruiting": "CRITICAL stage: regular moisture prevents fruit cracking and blossom end rot.",
        "maturity": "Low water sensitivity; reduce irrigation to promote ripening and prevent rot."
    }

    return {
        "crop": crop_info["name"],
        "variety": variety or "Standard High-Yielding",
        "planting_date": planting_date_str,
        "days_elapsed": days_elapsed,
        "auto_detected_stage": auto_stage,
        "active_stage": final_stage,
        "is_manually_overridden": is_overridden,
        "stage_progress_pct": stage_progress,
        "water_sensitivity": sensitivity_map.get(final_stage, "Normal sensitivity"),
        "total_expected_duration_days": sum(stage_days.values()),
        "stage_breakdown_days": stage_days
    }
