"""
AgriEdge Rainfall Agent
Analyzes precipitation probability, intensity, risk factors (heavy downpour, waterlogging, dry spells),
and delineates safe farm management and irrigation windows.
"""

from typing import Dict, Any, List


class RainfallAgent:
    @staticmethod
    def analyze_rainfall_profile(forecast_days: List[Dict[str, Any]], current_condition: str = "") -> Dict[str, Any]:
        """
        Evaluates:
        - Rain risk (Low / Moderate / High / Imminent)
        - Flood / Waterlogging risk
        - Dry spell alert
        - Consecutive rainy days
        - Optimal irrigation window
        """
        total_5day_rain = sum(d.get("rain_mm", 0.0) for d in forecast_days)
        max_single_day_rain = max([d.get("rain_mm", 0.0) for d in forecast_days] or [0.0])
        consecutive_rain_days = 0
        current_streak = 0
        for d in forecast_days:
            if d.get("rain_mm", 0.0) > 2.0:
                current_streak += 1
                consecutive_rain_days = max(consecutive_rain_days, current_streak)
            else:
                current_streak = 0

        # Assess Rain Risk
        first_day_rain = forecast_days[0].get("rain_mm", 0.0) if forecast_days else 0.0
        first_day_pop = forecast_days[0].get("pop", 0.0) if forecast_days else 0.0

        if first_day_rain >= 15.0 or (first_day_rain >= 5.0 and first_day_pop >= 70):
            rain_risk = "HIGH"
            rain_risk_description = f"Substantial rainfall (~{first_day_rain:.1f} mm) is expected in the next 24 hours with {first_day_pop:.0f}% probability."
        elif first_day_rain > 2.0 or first_day_pop >= 50:
            rain_risk = "MODERATE"
            rain_risk_description = f"Light to moderate rainfall (~{first_day_rain:.1f} mm) expected with {first_day_pop:.0f}% probability."
        else:
            rain_risk = "LOW"
            rain_risk_description = "Dry or trace rainfall conditions in the immediate 24-hour horizon."

        # Flood / Waterlogging Risk
        if max_single_day_rain > 40.0 or total_5day_rain > 80.0:
            flood_risk = "HIGH"
            flood_action = "Ensure field drainage channels are cleared to prevent root-zone hypoxia."
        elif max_single_day_rain > 20.0 or total_5day_rain > 40.0:
            flood_risk = "MODERATE"
            flood_action = "Check low-lying bunds and avoid heavy irrigation."
        else:
            flood_risk = "LOW"
            flood_action = "Normal drainage conditions."

        # Dry Spell Detection
        dry_days = sum(1 for d in forecast_days if d.get("rain_mm", 0.0) < 1.0)
        is_dry_spell = dry_days >= 4
        dry_spell_note = (
            f"Extended dry spell detected ({dry_days} of next 5 days dry). Soil water depletion will accelerate."
            if is_dry_spell else "Periodic moisture replenishment expected."
        )

        # Irrigation Window Recommendation
        if rain_risk == "HIGH":
            irrigation_window = "Postpone: High rain probability within 24h"
        elif first_day_rain > 5.0:
            irrigation_window = "Delay 24-36h until rain passes"
        else:
            irrigation_window = "Open: Suitable for irrigation or fertigation"

        return {
            "rain_risk": rain_risk,
            "rain_risk_description": rain_risk_description,
            "flood_risk": flood_risk,
            "flood_action": flood_action,
            "total_5day_rain_mm": round(total_5day_rain, 1),
            "max_single_day_rain_mm": round(max_single_day_rain, 1),
            "consecutive_rainy_days": consecutive_rain_days,
            "dry_spell_detected": is_dry_spell,
            "dry_spell_note": dry_spell_note,
            "irrigation_window": irrigation_window,
            "confidence_statement": "Probabilistic assessment based on ensemble meteorological forecast."
        }
