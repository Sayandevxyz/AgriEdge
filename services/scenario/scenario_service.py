"""
AgriEdge Scenario Agent & What-If Simulator
Simulates farmer management choices versus AI-optimized schedules.
Compares water volume, pump energy, operational costs, and crop yield risk.
"""

from typing import Dict, Any, List
from services.irrigation.et_engine import calculate_irrigation_requirement
from services.irrigation.energy_engine import calculate_pump_energy_and_cost


class ScenarioAgent:
    @staticmethod
    def simulate_scenarios(
        crop: str,
        growth_stage: str,
        farm_acres: float,
        et0_mm: float = 4.8,
        pump_hp: float = 5.0,
        forecast_rain_24h_mm: float = 18.0,
        forecast_rain_48h_mm: float = 8.0,
    ) -> Dict[str, Any]:
        """
        Generates side-by-side scenario simulations:
        1. Base/Farmer Habit Plan: 'Irrigate full quota today regardless of weather'
        2. AI-Optimized Plan: 'Skip today and leverage incoming rainfall'
        3. Scenario A: 'Wait 2 Days'
        4. Scenario B: 'Reduce Irrigation by 20%'
        5. Scenario C: 'Heavy Rain 35mm Occurs'
        """
        # Baseline conventional calculation (no rain deduction)
        base_calc = calculate_irrigation_requirement(
            et0_mm_day=et0_mm,
            crop_key=crop,
            growth_stage=growth_stage,
            farm_acres=farm_acres,
            forecast_rainfall_24h_mm=0.0,
            forecast_rainfall_48h_mm=0.0
        )
        base_energy = calculate_pump_energy_and_cost(
            volume_litres=base_calc["gross_volume_litres"],
            pump_hp=pump_hp
        )

        # AI-optimized (incorporating rainfall forecast)
        ai_calc = calculate_irrigation_requirement(
            et0_mm_day=et0_mm,
            crop_key=crop,
            growth_stage=growth_stage,
            farm_acres=farm_acres,
            forecast_rainfall_24h_mm=forecast_rain_24h_mm,
            forecast_rainfall_48h_mm=forecast_rain_48h_mm
        )
        ai_energy = calculate_pump_energy_and_cost(
            volume_litres=ai_calc["gross_volume_litres"],
            pump_hp=pump_hp,
            baseline_volume_litres=base_calc["gross_volume_litres"]
        )

        # What if Wait 2 Days
        wait_water = round(ai_calc["gross_volume_litres"] * 0.3)
        wait_energy = calculate_pump_energy_and_cost(volume_litres=wait_water, pump_hp=pump_hp)

        # What if Reduce by 20%
        reduced_water = round(base_calc["gross_volume_litres"] * 0.8)
        reduced_energy = calculate_pump_energy_and_cost(volume_litres=reduced_water, pump_hp=pump_hp)

        scenarios_list = [
            {
                "id": "conventional_habit",
                "title": "Irrigate Today (Conventional Routine)",
                "description": "Routine irrigation without adjusting for rain forecast.",
                "water_litres": base_calc["gross_volume_litres"],
                "energy_kwh": base_energy["energy_consumed"],
                "cost_inr": base_energy["estimated_cost_inr"],
                "risk_level": "MODERATE",
                "risk_reason": "Risk of waterlogging and nutrient leaching when rain hits saturated soil.",
                "is_recommended": False
            },
            {
                "id": "ai_optimized",
                "title": "AgriEdge AI-Optimized Plan",
                "description": f"Defer/skip today. Expected rainfall ({forecast_rain_24h_mm} mm) fulfills soil moisture demand.",
                "water_litres": ai_calc["gross_volume_litres"],
                "energy_kwh": ai_energy["energy_consumed"],
                "cost_inr": ai_energy["estimated_cost_inr"],
                "risk_level": "LOW",
                "risk_reason": "Maximizes natural precipitation capture while conserving groundwater and power.",
                "is_recommended": True
            },
            {
                "id": "wait_2_days",
                "title": "Wait 2 Days Before Pumping",
                "description": "Re-evaluate soil condition after 48-hour rain cycle completes.",
                "water_litres": wait_water,
                "energy_kwh": wait_energy["energy_consumed"],
                "cost_inr": wait_energy["estimated_cost_inr"],
                "risk_level": "LOW",
                "risk_reason": "Minor surface dry-out possible in sandy soils; safe in loam/clay soils.",
                "is_recommended": False
            },
            {
                "id": "reduce_20_pct",
                "title": "Reduce Irrigation by 20%",
                "description": "Apply deficit pulse to preserve root hydration while leaving soil capacity for rain.",
                "water_litres": reduced_water,
                "energy_kwh": reduced_energy["energy_consumed"],
                "cost_inr": reduced_energy["estimated_cost_inr"],
                "risk_level": "LOW_TO_MODERATE",
                "risk_reason": "Moderate water saving; good intermediate safety buffer.",
                "is_recommended": False
            }
        ]

        water_savings = base_calc["gross_volume_litres"] - ai_calc["gross_volume_litres"]
        energy_savings = base_energy["energy_consumed"] - ai_energy["energy_consumed"]
        cost_savings = base_energy["estimated_cost_inr"] - ai_energy["estimated_cost_inr"]

        return {
            "crop": crop,
            "farm_acres": farm_acres,
            "forecast_rain_24h_mm": forecast_rain_24h_mm,
            "comparison": {
                "conventional_water_litres": base_calc["gross_volume_litres"],
                "ai_optimized_water_litres": ai_calc["gross_volume_litres"],
                "potential_water_saved_litres": max(0, water_savings),
                "potential_energy_saved_kwh": max(0.0, round(energy_savings, 2)),
                "potential_cost_saved_inr": max(0.0, round(cost_savings, 2)),
            },
            "scenarios": scenarios_list
        }


scenario_agent = ScenarioAgent()
