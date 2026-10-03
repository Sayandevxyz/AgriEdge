"""
AgriEdge Vision & Leaf Image Upload Pipeline Router
Validates uploaded image MIME type, file size, and sharpness before running
optical lesion analysis and generating unified crop advisory.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import User
from apps.api.auth import get_current_user
from services.vision.vision_service import vision_agent
from services.advisory.advisory_orchestrator import advisory_orchestrator

router = APIRouter(prefix="", tags=["Vision"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/vision/detect-crop")
async def detect_crop_endpoint(
    file: UploadFile = File(...)
):
    """
    Automated AI Crop Analyzer:
    Detects crop species (Tomato, Chilli, Rice, Wheat, Cotton, Maize), botanical family,
    suggested variety, and morphological features directly from uploaded leaf imagery.
    Removes the burden of manual crop selection from the farmer.
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_IMAGE_TYPE",
                "message": f"Unsupported file type '{file.content_type}'. Allowed types are JPEG, PNG, and WebP."
            }
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IMAGE_TOO_LARGE",
                "message": f"File size exceeds maximum permitted limit of 10 MB."
            }
        )

    detection_result = await vision_agent.detect_crop(
        image_bytes=image_bytes,
        filename_hint=file.filename
    )

    return {
        "success": True,
        "detection": detection_result
    }


@router.post("/vision/analyze")
async def analyze_crop_image_endpoint(
    file: UploadFile = File(...),
    crop_name: Optional[str] = Form("auto"),
    planting_date: str = Form("2026-08-20"),
    farm_acres: float = Form(2.0),
    soil_type: str = Form("loam"),
    irrigation_method: str = Form("drip"),
    pump_hp: float = Form(5.0),
    pump_type: str = Form("electric"),
    latitude: float = Form(12.97),
    longitude: float = Form(77.59),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. MIME type validation
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_IMAGE_TYPE",
                "message": f"Unsupported file type '{file.content_type}'. Allowed types are JPEG, PNG, and WebP."
            }
        )

    # 2. File size validation
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IMAGE_TOO_LARGE",
                "message": f"File size exceeds maximum permitted limit of 10 MB ({len(image_bytes)/(1024*1024):.1f} MB uploaded)."
            }
        )

    # 3. Auto-detect crop if requested or left as default 'auto'
    detected_crop_data = None
    resolved_crop = crop_name
    if not resolved_crop or resolved_crop.lower() in ["auto", "auto_detect", "detect", ""]:
        detected_crop_data = await vision_agent.detect_crop(
            image_bytes=image_bytes,
            filename_hint=file.filename
        )
        resolved_crop = detected_crop_data.get("crop", "Tomato")

    # 4. Vision Agent Image Quality Validation & Optical Analysis
    vision_outcome = await vision_agent.analyze_crop_image(
        image_bytes=image_bytes,
        crop_name=resolved_crop,
        context={"soil": soil_type, "acres": farm_acres}
    )

    if not vision_outcome.get("success"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": vision_outcome.get("quality_check", {}).get("error_code", "IMAGE_QUALITY_ERROR"),
                "message": vision_outcome.get("error", "Image quality validation failed.")
            }
        )

    # 5. Integrate into full crop advisory with water & energy
    full_advisory = await advisory_orchestrator.generate_advisory(
        crop=resolved_crop,
        planting_date=planting_date,
        farm_acres=farm_acres,
        soil_type=soil_type,
        irrigation_method=irrigation_method,
        pump_hp=pump_hp,
        pump_type=pump_type,
        latitude=latitude,
        longitude=longitude,
        image_bytes=image_bytes
    )

    return {
        "success": True,
        "image_quality": vision_outcome["quality_check"],
        "crop_detection": detected_crop_data or {
            "crop": resolved_crop,
            "confidence": 0.95,
            "source": "Manual / Specified"
        },
        "vision_inference": vision_outcome["inference"],
        "advisory": full_advisory
    }
