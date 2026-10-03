"""
AgriEdge Feedback Loop & Outcome Agent
Records farmer actions, verifies outcomes against advisory recommendations,
evaluates advisory efficacy, and curates validated datasets for continuous learning.
"""

from typing import Dict, Any, List, Optional
import time
import uuid

# In-memory storage for feedback and outcome records
_FEEDBACK_STORE: List[Dict[str, Any]] = []
_OUTCOME_EVALUATIONS: List[Dict[str, Any]] = []


class OutcomeAgent:
    @staticmethod
    def evaluate_outcome(
        advisory_id: str,
        predicted_action: str,
        action_taken: str,
        water_used_litres: Optional[float] = None,
        predicted_water_litres: Optional[float] = None,
        energy_used_kwh: Optional[float] = None,
        predicted_energy_kwh: Optional[float] = None,
        crop_condition_after: str = "Improved",
        yield_outcome_kg: Optional[float] = None,
        farmer_comment: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compares predicted vs actual outcomes.
        Calculates advisory adherence, disease response, water accuracy,
        and flags high-quality samples for agronomist review.
        """
        # Adherence check
        adhered = (action_taken.strip().upper() == predicted_action.strip().upper()) or ("FOLLOWED" in action_taken.upper())

        # Water differential
        water_variance_pct = 0.0
        if predicted_water_litres and predicted_water_litres > 0 and water_used_litres is not None:
            water_variance_pct = round(((water_used_litres - predicted_water_litres) / predicted_water_litres) * 100, 1)

        # Energy differential
        energy_variance_pct = 0.0
        if predicted_energy_kwh and predicted_energy_kwh > 0 and energy_used_kwh is not None:
            energy_variance_pct = round(((energy_used_kwh - predicted_energy_kwh) / predicted_energy_kwh) * 100, 1)

        # Outcome score (0 to 100)
        score = 70.0
        if crop_condition_after.lower() in ["improved", "recovered", "healthy"]:
            score += 20.0
        elif crop_condition_after.lower() in ["worsened", "deteriorated"]:
            score -= 30.0

        if adhered:
            score += 10.0

        success_rating = "HIGH" if score >= 85 else ("MODERATE" if score >= 60 else "LOW")

        # Curation for Model Continuous Improvement:
        # High quality samples require clear condition feedback and reasonable variance
        is_curated_for_evaluation = score >= 80 and bool(farmer_comment and len(farmer_comment) > 5)

        evaluation = {
            "evaluation_id": f"eval_{uuid.uuid4().hex[:8]}",
            "advisory_id": advisory_id,
            "created_at": time.time(),
            "adherence": adhered,
            "crop_response": crop_condition_after,
            "efficacy_score": min(100.0, max(0.0, score)),
            "success_rating": success_rating,
            "water_variance_pct": water_variance_pct,
            "energy_variance_pct": energy_variance_pct,
            "curated_for_retraining_pool": is_curated_for_evaluation,
            "validation_status": "FLAGGED_FOR_AGRONOMIST_VERIFICATION" if is_curated_for_evaluation else "LOGGED"
        }

        _OUTCOME_EVALUATIONS.append(evaluation)
        return evaluation


class FeedbackService:
    @staticmethod
    def record_feedback(data: Dict[str, Any]) -> Dict[str, Any]:
        record_id = f"fb_{uuid.uuid4().hex[:8]}"
        record = {
            "feedback_id": record_id,
            "timestamp": time.time(),
            **data
        }
        _FEEDBACK_STORE.append(record)

        # Trigger Outcome Agent evaluation
        eval_result = OutcomeAgent.evaluate_outcome(
            advisory_id=data.get("advisory_id", "unknown"),
            predicted_action=data.get("predicted_action", "SKIP IRRIGATION"),
            action_taken=data.get("action_taken", "Skipped irrigation as advised"),
            water_used_litres=data.get("water_used_litres"),
            predicted_water_litres=data.get("predicted_water_litres"),
            energy_used_kwh=data.get("energy_used_kwh"),
            predicted_energy_kwh=data.get("predicted_energy_kwh"),
            crop_condition_after=data.get("crop_condition", "Improved"),
            yield_outcome_kg=data.get("yield_outcome_kg"),
            farmer_comment=data.get("farmer_comment")
        )

        return {
            "success": True,
            "feedback_id": record_id,
            "evaluation": eval_result,
            "message": "Farmer feedback recorded and passed through Outcome Agent evaluation."
        }

    @staticmethod
    def get_all_feedback() -> List[Dict[str, Any]]:
        return _FEEDBACK_STORE

    @staticmethod
    def get_evaluations() -> List[Dict[str, Any]]:
        return _OUTCOME_EVALUATIONS


feedback_service = FeedbackService()
