"""
AgriEdge Feedback & Outcome Agent Router
Captures post-advisory field results, computes water and energy differentials,
and logs validated outcomes for continuous model improvement.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import User, Feedback
from apps.api.schemas import FeedbackSubmitRequest
from apps.api.auth import get_current_user
from services.feedback.feedback_service import feedback_service

router = APIRouter(prefix="", tags=["Feedback & Outcomes"])


@router.post("/feedback")
def submit_farmer_feedback(
    req: FeedbackSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = feedback_service.record_feedback(req.model_dump())
    
    # Store feedback record in database
    db_feedback = Feedback(
        feedback_uuid=result["feedback_id"],
        advisory_uuid=req.advisory_id,
        action_taken=req.action_taken,
        water_used_litres=req.water_used_litres,
        energy_used_kwh=req.energy_used_kwh,
        crop_condition_after=req.crop_condition,
        yield_outcome_kg=req.yield_outcome_kg,
        farmer_comment=req.farmer_comment,
        curated_for_retraining=result["evaluation"]["curated_for_retraining_pool"]
    )
    db.add(db_feedback)
    db.commit()

    return result


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
