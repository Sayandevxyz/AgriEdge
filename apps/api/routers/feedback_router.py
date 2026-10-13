"""
AgriEdge Feedback & Outcome Agent Router
Captures post-advisory field results, computes water and energy differentials,
and logs validated outcomes for continuous model improvement.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import User, Feedback, Advisory, Farm, FarmerProfile, utc_now
from apps.api.schemas import FeedbackSubmitRequest, FeedbackCurateRequest
from apps.api.auth import get_current_user
from services.feedback.feedback_service import feedback_service

router = APIRouter(prefix="", tags=["Feedback & Outcomes"])


@router.post("/feedback")
def submit_farmer_feedback(
    req: FeedbackSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ownership verification: ensure caller cannot submit feedback on another user's advisory
    if current_user.role not in ["SYSTEM_ADMIN", "FPO_ADMIN"]:
        advisory = db.query(Advisory).filter(Advisory.advisory_uuid == req.advisory_id).first()
        if advisory and advisory.crop:
            profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
            farm = db.query(Farm).filter(Farm.id == advisory.crop.farm_id).first()
            if farm and (not profile or farm.farmer_id != profile.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": "You do not have permission to submit feedback for another farmer's advisory."}
                )

    result = feedback_service.record_feedback(req.model_dump())
    
    # Store feedback record in database
    # Curation for retraining is NEVER done automatically via length heuristics.
    # It must be approved explicitly by AGRONOMIST or FPO_ADMIN via PATCH /feedback/{id}/curate.
    db_feedback = Feedback(
        feedback_uuid=result["feedback_id"],
        advisory_uuid=req.advisory_id,
        action_taken=req.action_taken,
        water_used_litres=req.water_used_litres,
        energy_used_kwh=req.energy_used_kwh,
        crop_condition_after=req.crop_condition,
        yield_outcome_kg=req.yield_outcome_kg,
        farmer_comment=req.farmer_comment,
        curated_for_retraining=False
    )
    db.add(db_feedback)
    db.commit()

    return result


@router.patch("/feedback/{feedback_id}/curate")
def curate_feedback(
    feedback_id: str,
    req: FeedbackCurateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Curate feedback for continuous model retraining.
    Protected endpoint: Only AGRONOMIST, FPO_ADMIN, or SYSTEM_ADMIN can approve feedback curation.
    """
    if current_user.role not in ["AGRONOMIST", "FPO_ADMIN", "SYSTEM_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Only an agronomist or FPO admin can approve feedback for model retraining."}
        )

    # Allow lookup by integer id or feedback_uuid
    query = db.query(Feedback)
    if feedback_id.isdigit():
        fb = query.filter((Feedback.id == int(feedback_id)) | (Feedback.feedback_uuid == feedback_id)).first()
    else:
        fb = query.filter(Feedback.feedback_uuid == feedback_id).first()

    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback record not found")

    is_approved = req.approved if req.approved is not None else req.curated
    fb.curated_for_retraining = is_approved
    fb.curated_by = current_user.email
    fb.curation_notes = req.notes
    fb.curated_at = utc_now()
    db.commit()
    db.refresh(fb)

    return {
        "success": True,
        "feedback_id": fb.feedback_uuid,
        "id": fb.id,
        "curated_for_retraining": fb.curated_for_retraining,
        "curated_by": fb.curated_by,
        "curation_notes": fb.curation_notes,
        "curated_at": fb.curated_at.isoformat() if fb.curated_at else None,
        "message": "Feedback successfully curated for model retraining pool."
    }



@router.post("/outcomes")
def record_outcome(
    req: FeedbackSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return submit_farmer_feedback(req, current_user, db)


@router.get("/feedback")
def list_all_feedbacks():
    return feedback_service.get_all_feedback()


@router.get("/feedback/{feedback_uuid}")
def get_feedback_by_uuid(
    feedback_uuid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fb = db.query(Feedback).filter(Feedback.feedback_uuid == feedback_uuid).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    if fb.advisory_uuid and current_user.role not in ["SYSTEM_ADMIN", "FPO_ADMIN"]:
        adv = db.query(Advisory).filter(Advisory.advisory_uuid == fb.advisory_uuid).first()
        if adv and adv.crop:
            profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
            farm = db.query(Farm).filter(Farm.id == adv.crop.farm_id).first()
            if farm and (not profile or farm.farmer_id != profile.id):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this feedback")
    return {
        "feedback_id": fb.feedback_uuid,
        "advisory_id": fb.advisory_uuid,
        "action_taken": fb.action_taken,
        "crop_condition": fb.crop_condition_after,
        "farmer_comment": fb.farmer_comment
    }
