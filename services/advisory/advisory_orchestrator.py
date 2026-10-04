"""
AgriEdge Advisory Orchestrator
Coordinates VisionAgent, ContextAgent, WeatherAgent, RainfallAgent,
EnergyWaterTriageAgent, CropStageAgent, and KnowledgeAgent into one coherent,
explainable advisory. Records execution latency and token metrics.
"""

import time
import uuid
from typing import Dict, Any, Optional
from services.irrigation.et_engine import calculate_fao56_et0, calculate_irrigation_requirement
from services.irrigation.energy_engine import calculate_pump_energy_and_cost
from services.crop_stage.crop_stage_service import determine_crop_stage
from services.weather.weather_service import weather_service
from services.weather.rainfall_agent import RainfallAgent
from services.vision.vision_service import vision_agent
from services.knowledge.rag_service import knowledge_agent
from services.advisory.realtime_advisory_agent import realtime_advisory_agent


class AdvisoryOrchestrator:
    async def generate_advisory(
        self,
        crop: str,
        planting_date: str,
        farm_acres: float = 2.0,
        soil_type: str = "loam",
        irrigation_method: str = "drip",
        pump_hp: float = 5.0,
        pump_type: str = "electric",
        discharge_lps: float = 8.0,
        latitude: float = 12.97,
        longitude: float = 77.59,
        image_bytes: Optional[bytes] = None,
        farmer_query: Optional[str] = None,
        language: str = "en",
        stage_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes multi-agent intelligence into structured, farmer-first recommendations.
        """
        start_time = time.time()
        request_id = f"adv_{uuid.uuid4().hex[:10]}"
        agent_executions = []

        # 0. Auto Crop Detection if crop is unspecified or set to 'auto'
        detected_crop_data = None
        if (not crop or crop.lower() in ["auto", "auto_detect", "detect", ""]) and image_bytes:
            t0 = time.time()
            detected_crop_data = await vision_agent.detect_crop(image_bytes)
            crop = detected_crop_data.get("crop", "Tomato")
            agent_executions.append({
                "agent_name": "CropClassifierAgent",
                "duration_ms": round((time.time() - t0) * 1000, 1),
                "status": "SUCCESS",
                "detected_crop": crop,
                "confidence": detected_crop_data.get("confidence", 0.95)
            })

        # 1. Crop Stage Agent
        t0 = time.time()
        stage_data = determine_crop_stage(
            crop_name=crop,
            planting_date_str=planting_date,
            stage_override=stage_override
        )
        agent_executions.append({
            "agent_name": "CropStageAgent",
            "duration_ms": round((time.time() - t0) * 1000, 1),
            "status": "SUCCESS"
        })

        # 2. Weather Agent
        t0 = time.time()
        weather_curr = await weather_service.get_current_weather(lat=latitude, lon=longitude)
        forecast_data = await weather_service.get_forecast(lat=latitude, lon=longitude)
        agent_executions.append({
            "agent_name": "WeatherAgent",
            "duration_ms": round((time.time() - t0) * 1000, 1),
            "status": "SUCCESS",
            "is_fallback": weather_curr.get("is_fallback", False)
        })

        # 3. Rainfall Agent
        t0 = time.time()
        rainfall_analysis = RainfallAgent.analyze_rainfall_profile(
            forecast_days=forecast_data.get("forecast_days", []),
            current_condition=weather_curr.get("condition", "")
        )
        agent_executions.append({
            "agent_name": "RainfallAgent",
            "duration_ms": round((time.time() - t0) * 1000, 1),
            "status": "SUCCESS"
        })

        # 4. Vision Agent (if image provided)
        vision_result = None
        if image_bytes and len(image_bytes) > 0:
            t0 = time.time()
            vision_result = await vision_agent.analyze_crop_image(
                image_bytes=image_bytes,
                crop_name=crop,
                context={"stage": stage_data["active_stage"], "soil": soil_type}
            )
            agent_executions.append({
                "agent_name": "VisionAgent",
                "duration_ms": round((time.time() - t0) * 1000, 1),
                "status": "SUCCESS" if vision_result.get("success") else "FAILED_VALIDATION"
            })

        # 5. FAO-56 Penman-Monteith ET0 Calculation
        t0 = time.time()
        et0 = calculate_fao56_et0(
            temp_c=weather_curr["temperature_c"],
            temp_min_c=weather_curr.get("temp_min_c"),
            temp_max_c=weather_curr.get("temp_max_c"),
            humidity_pct=weather_curr["humidity_pct"],
            wind_speed_2m_ms=weather_curr["wind_speed_ms"],
            latitude_deg=latitude
        )

        # 6. Water Triage Calculation
        rain_24h = forecast_data.get("rain_24h_mm", 0.0)
        rain_48h = forecast_data.get("rain_48h_mm", 0.0)
        irrigation_calc = calculate_irrigation_requirement(
            et0_mm_day=et0,
            crop_key=crop,
            growth_stage=stage_data["active_stage"],
            farm_acres=farm_acres,
            irrigation_method=irrigation_method,
            forecast_rainfall_24h_mm=rain_24h,
            forecast_rainfall_48h_mm=rain_48h,
            soil_type=soil_type
        )

        # 7. Energy & Pump Calculation
        energy_calc = calculate_pump_energy_and_cost(
            volume_litres=irrigation_calc["gross_volume_litres"],
            pump_hp=pump_hp,
            pump_type=pump_type,
            discharge_lps=discharge_lps,
            baseline_volume_litres=irrigation_calc["baseline_volume_litres"]
        )
        agent_executions.append({
            "agent_name": "EnergyWaterTriageAgent",
            "duration_ms": round((time.time() - t0) * 1000, 1),
            "status": "SUCCESS"
        })

        # 8. Knowledge & RAG Retrieval
        t0 = time.time()
        query_topic = (
            (vision_result["inference"]["disease_detected"] if vision_result and vision_result.get("success") else "")
            + " " + (farmer_query or "water management")
        )
        retrieved_docs = knowledge_agent.retrieve_knowledge(crop=crop, query_or_topic=query_topic, limit=2)
        agent_executions.append({
            "agent_name": "KnowledgeAgent",
            "duration_ms": round((time.time() - t0) * 1000, 1),
            "status": "SUCCESS",
            "retrieved_count": len(retrieved_docs)
        })

        # Synthesize structured advisory
        disease_info = None
        treatment_advice = "No acute disease symptoms detected. Maintain standard preventative foliar hygiene."
        if vision_result and vision_result.get("success"):
            inference = vision_result["inference"]
            disease_info = {
                "detected": inference.get("disease_detected", "Healthy"),
                "confidence": inference.get("confidence", 0.85),
                "severity": inference.get("severity", "Moderate"),
                "affected_area_pct": inference.get("affected_area_pct", 5.0),
                "visual_explanation": inference.get("visual_explanation", ""),
                "requires_verification": inference.get("requires_agronomist_verification", False)
            }
            if "Blight" in disease_info["detected"]:
                treatment_advice = "Prune infected lower leaves. Spray Copper Oxychloride 50% WP @ 2.5 g/L or Mancozeb 75% WP @ 2.0 g/L. Avoid overhead splashing."
            elif "Anthracnose" in disease_info["detected"]:
                treatment_advice = "Spray Azoxystrobin 23% SC @ 1 ml/L or Difenoconazole 25% EC @ 0.5 ml/L. Ensure adequate soil drainage."
            elif "Powdery" in disease_info["detected"]:
                treatment_advice = "Spray Wettable Sulfur 80% WP @ 3.0 g/L or Neem Oil (3%) during early morning or late evening."

        # 9. Real-Time Multi-Agent AI Synthesis
        t0 = time.time()
        ai_synthesis = await realtime_advisory_agent.synthesize(
            crop=crop,
            stage_data=stage_data,
            farm_acres=farm_acres,
            soil_type=soil_type,
            irrigation_method=irrigation_method,
            weather_curr=weather_curr,
            forecast_data=forecast_data,
            irrigation_calc=irrigation_calc,
            energy_calc=energy_calc,
            disease_info=disease_info,
            retrieved_docs=retrieved_docs,
            farmer_query=farmer_query,
            language=language
        )
        agent_executions.append({
            "agent_name": "RealTimeAdvisoryAgent",
            "duration_ms": ai_synthesis.get("duration_ms", 0.0),
            "status": "SUCCESS",
            "model": ai_synthesis.get("model", "AgriEdge-AI"),
            "is_realtime": ai_synthesis.get("is_realtime", False)
        })

        summary = ai_synthesis.get("summary")
        what_to_do = ai_synthesis.get("what_to_do", [
            f"Follow irrigation decision: {irrigation_calc['action']}.",
            treatment_advice if disease_info else "Inspect crops early morning for early insect or fungal incidence.",
            "Keep bunds clean to allow uniform drainage during expected rainfall."
        ])
        what_not_to_do = ai_synthesis.get("what_not_to_do", [
            "Do NOT run agricultural pumps during peak noon heat (11:00 AM - 3:00 PM) to avoid high evaporative losses.",
            "Do NOT apply nitrogen fertilizers immediately prior to heavy rains to prevent leaching.",
            "Do NOT spray pesticides when high wind (> 15 km/h) or immediate rainfall is forecast."
        ])

        total_duration = round((time.time() - start_time) * 1000, 1)

        return {
            "advisory_id": request_id,
            "created_at": time.time(),
            "summary": summary,
            "crop_context": {
                "crop": crop.capitalize(),
                "variety": stage_data["variety"],
                "active_stage": stage_data["active_stage"],
                "days_elapsed": stage_data["days_elapsed"],
                "stage_progress_pct": stage_data["stage_progress_pct"],
                "water_sensitivity": stage_data["water_sensitivity"],
                "farm_acres": farm_acres,
                "soil_type": soil_type,
                "irrigation_method": irrigation_method
            },
            "water": {
                "action": irrigation_calc["action"],
                "urgency": irrigation_calc["urgency"],
                "et0_mm_day": irrigation_calc["et0_mm_day"],
                "kc": irrigation_calc["kc"],
                "etc_mm_day": irrigation_calc["etc_mm_day"],
                "estimated_gross_volume_litres": irrigation_calc["gross_volume_litres"],
                "potential_water_saved_litres": irrigation_calc["water_saved_litres"],
                "effective_rainfall_mm": irrigation_calc["effective_rainfall_mm"],
                "why": irrigation_calc["why"],
                "badge": "ESTIMATED"
            },
            "energy": {
                "pump_hp": pump_hp,
                "pump_type": pump_type,
                "power_kw": energy_calc["power_kw"],
                "estimated_runtime_hours": energy_calc["estimated_runtime_hours"],
                "energy_consumed": energy_calc["energy_consumed"],
                "energy_unit": energy_calc["energy_unit"],
                "estimated_cost_inr": energy_calc["estimated_cost_inr"],
                "potential_saved_energy": energy_calc["potential_saved_energy"],
                "potential_saved_cost_inr": energy_calc["potential_saved_cost_inr"],
                "badge": "ESTIMATED"
            },
            "crop_health": disease_info or {
                "detected": "Not Assessed (No image provided)",
                "confidence": 0.0,
                "severity": "None",
                "affected_area_pct": 0.0,
                "visual_explanation": "Upload leaf image to evaluate foliar diseases.",
                "requires_verification": False,
                "badge": "USER REPORTED"
            },
            "what_to_do": what_to_do,
            "what_not_to_do": what_not_to_do,
            "weather_context": {
                "temperature_c": weather_curr["temperature_c"],
                "humidity_pct": weather_curr["humidity_pct"],
                "condition": weather_curr["condition"],
                "rainfall_24h_mm": rain_24h,
                "rain_risk": rainfall_analysis["rain_risk"],
                "irrigation_window": rainfall_analysis["irrigation_window"],
                "is_fallback": weather_curr.get("is_fallback", False),
                "data_source": weather_curr.get("data_source", "Weather Provider"),
                "badge": "MEASURED / FORECAST"
            },
            "treatment": treatment_advice,
            "citations": [
                {"title": doc["title"], "source": doc["source"], "citations": doc["citations"]}
                for doc in retrieved_docs
            ],
            "safety_note": (
                "Agronomic recommendations are AI-guided estimates based on meteorological and crop models. "
                "Consult a local extension officer or certified agronomist for severe outbreaks or high-value pesticide treatments."
            ),
            "execution_metadata": {
                "request_id": request_id,
                "total_duration_ms": total_duration,
                "is_realtime": ai_synthesis.get("is_realtime", False),
                "agent_model": ai_synthesis.get("model", "AgriEdge-AI"),
                "agents_involved": agent_executions
            }
        }


advisory_orchestrator = AdvisoryOrchestrator()
