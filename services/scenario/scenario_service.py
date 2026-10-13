"""
AgriEdge Scenario Agent & What-If Simulator
Simulates farmer management choices versus AI-optimized schedules.
Compares water volume, pump energy, operational costs, and crop yield risk
using real-time field weather forecasts and live agro-meteorological metrics.
"""

import math
from typing import Dict, Any, List, Optional
from services.irrigation.et_engine import calculate_irrigation_requirement
from services.irrigation.energy_engine import calculate_pump_energy_and_cost
from services.weather.weather_service import weather_service
from services.location.location_service import location_service


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

        # Scenario 5: Heatwave Stress (ET0 +20%)
        heatwave_et0 = round(et0_mm * 1.20, 2)
        heatwave_calc = calculate_irrigation_requirement(
            et0_mm_day=heatwave_et0,
            crop_key=crop,
            growth_stage=growth_stage,
            farm_acres=farm_acres,
            forecast_rainfall_24h_mm=forecast_rain_24h_mm,
            forecast_rainfall_48h_mm=forecast_rain_48h_mm
        )
        heatwave_energy = calculate_pump_energy_and_cost(
            volume_litres=heatwave_calc["gross_volume_litres"],
            pump_hp=pump_hp
        )

        # Scenario 6: Drought (7-day zero rain)
        drought_calc = calculate_irrigation_requirement(
            et0_mm_day=et0_mm,
            crop_key=crop,
            growth_stage=growth_stage,
            farm_acres=farm_acres,
            forecast_rainfall_24h_mm=0.0,
            forecast_rainfall_48h_mm=0.0
        )
        drought_energy = calculate_pump_energy_and_cost(
            volume_litres=drought_calc["gross_volume_litres"],
            pump_hp=pump_hp
        )

        # Scenario 7: Power Outage (Diesel Pump Fallback)
        diesel_energy = calculate_pump_energy_and_cost(
            volume_litres=ai_calc["gross_volume_litres"],
            pump_hp=pump_hp,
            pump_type="diesel"
        )

        # Scenario 8: Electric -> Solar Pump Conversion (₹0/kWh grid tariff)
        solar_energy = calculate_pump_energy_and_cost(
            volume_litres=ai_calc["gross_volume_litres"],
            pump_hp=pump_hp,
            pump_type="electric",
            electricity_tariff_inr_kwh=0.0
        )

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
                "description": f"Rainfall forecast ({forecast_rain_24h_mm:.1f} mm) is incorporated into soil water balance.",
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
                "risk_reason": "Safe intermediate deferral; leaves buffer for soil moisture retention.",
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
            },
            {
                "id": "heatwave_stress",
                "title": "Heatwave Stress (ET₀ +20%)",
                "description": f"Simulates thermal heatwave where evaporative atmospheric demand spikes to {heatwave_et0} mm/day.",
                "water_litres": heatwave_calc["gross_volume_litres"],
                "energy_kwh": heatwave_energy["energy_consumed"],
                "cost_inr": heatwave_energy["estimated_cost_inr"],
                "risk_level": "HIGH",
                "risk_reason": "Atmospheric demand spikes; crop water consumption increases by ~20%.",
                "is_recommended": False
            },
            {
                "id": "drought_7d",
                "title": "Drought Stress (7 Days Zero Rain)",
                "description": "Simulates complete dry spell with 0mm precipitation over a 7-day period.",
                "water_litres": drought_calc["gross_volume_litres"],
                "energy_kwh": drought_energy["energy_consumed"],
                "cost_inr": drought_energy["estimated_cost_inr"],
                "risk_level": "MODERATE_TO_HIGH",
                "risk_reason": "Zero natural precipitation offset; requires 100% supplemental aquifer pumping.",
                "is_recommended": False
            },
            {
                "id": "power_outage_diesel",
                "title": "Power Outage (Diesel Pump Fallback)",
                "description": "Grid power outage; irrigation powered by backup diesel engine set.",
                "water_litres": ai_calc["gross_volume_litres"],
                "energy_kwh": diesel_energy["energy_consumed"],
                "cost_inr": diesel_energy["estimated_cost_inr"],
                "risk_level": "HIGH_COST",
                "risk_reason": f"Operational expense increases significantly due to diesel fuel costs (₹92/L).",
                "is_recommended": False
            },
            {
                "id": "solar_pump_conversion",
                "title": "Electric → Solar Pump Conversion",
                "description": "Upgrades pump to off-grid Solar PV direct pumping at zero recurring tariff (₹0/kWh).",
                "water_litres": ai_calc["gross_volume_litres"],
                "energy_kwh": solar_energy["energy_consumed"],
                "cost_inr": solar_energy["estimated_cost_inr"],
                "risk_level": "VERY_LOW",
                "risk_reason": "Zero operational electricity tariff (₹0/kWh) and daylight-synchronized irrigation.",
                "is_recommended": True
            }
        ]

        water_savings = base_calc["gross_volume_litres"] - ai_calc["gross_volume_litres"]
        energy_savings = base_energy["energy_consumed"] - ai_energy["energy_consumed"]
        cost_savings = base_energy["estimated_cost_inr"] - ai_energy["estimated_cost_inr"]

        return {
            "crop": crop,
            "farm_acres": farm_acres,
            "forecast_rain_24h_mm": forecast_rain_24h_mm,
            "forecast_rain_48h_mm": forecast_rain_48h_mm,
            "et0_mm": et0_mm,
            "comparison": {
                "conventional_water_litres": base_calc["gross_volume_litres"],
                "ai_optimized_water_litres": ai_calc["gross_volume_litres"],
                "potential_water_saved_litres": max(0, water_savings),
                "potential_energy_saved_kwh": max(0.0, round(energy_savings, 2)),
                "potential_cost_saved_inr": max(0.0, round(cost_savings, 2)),
            },
            "scenarios": scenarios_list
        }

    @staticmethod
    async def simulate_realtime_scenarios(
        crop: str,
        growth_stage: str,
        farm_acres: float,
        pump_hp: float = 5.0,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        et0_override: Optional[float] = None,
        rain_24h_override: Optional[float] = None,
        rain_48h_override: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Dynamically extracts real-time meteorological metrics for the farm location
        and simulates live management choices.
        """
        lat = latitude
        lon = longitude
        location_info = None

        if lat is None or lon is None:
            ip_loc = await location_service.detect_ip_location()
            lat = ip_loc["latitude"]
            lon = ip_loc["longitude"]
            location_info = ip_loc
        else:
            location_info = await location_service.reverse_geocode(lat, lon)

        # Fetch live forecast
        weather_fc = await weather_service.get_forecast(lat=lat, lon=lon)
        weather_curr = await weather_service.get_current_weather(lat=lat, lon=lon)

        # Compute dynamic ET0 if not explicitly overridden
        if et0_override is not None:
            et0_val = et0_override
        else:
            t_curr = weather_curr.get("temperature_c", 28.0)
            t_min = weather_curr.get("temp_min_c", 22.0)
            t_max = weather_curr.get("temp_max_c", 32.0)
            # Hargreaves-Samani formulation
            delta_t = max(1.0, t_max - t_min)
            et0_val = round(0.0023 * (t_curr + 17.8) * math.sqrt(delta_t) * 4.2, 2)
            et0_val = max(2.5, min(7.5, et0_val))

        rain_24h = rain_24h_override if rain_24h_override is not None else float(weather_fc.get("rain_24h_mm", 0.0))
        rain_48h = rain_48h_override if rain_48h_override is not None else float(weather_fc.get("rain_48h_mm", 0.0))

        sim = ScenarioAgent.simulate_scenarios(
            crop=crop,
            growth_stage=growth_stage,
            farm_acres=farm_acres,
            et0_mm=et0_val,
            pump_hp=pump_hp,
            forecast_rain_24h_mm=rain_24h,
            forecast_rain_48h_mm=rain_48h
        )

        sim["is_realtime"] = True
        sim["location"] = location_info
        sim["location_name"] = location_info.get("formatted_location")
        sim["live_weather"] = {
            "temperature_c": weather_curr.get("temperature_c"),
            "condition": weather_curr.get("condition"),
            "humidity_pct": weather_curr.get("humidity_pct"),
            "wind_speed_ms": weather_curr.get("wind_speed_ms"),
            "source": weather_curr.get("data_source")
        }
        return sim


scenario_agent = ScenarioAgent()
