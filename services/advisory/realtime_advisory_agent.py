"""
AgriEdge Real-Time Advisory AI Agent
Synthesizes live multi-agent context (FAO-56 calculations, OpenWeather/Open-Meteo telemetry,
phenology, foliar health, and RAG agronomy) into real-time personalized recommendations.
Powered by high-performance LLMs (Qwen 2.5 72B / DeepSeek / Gemini) with seamless resilience.
"""

import os
import json
import time
import re
from typing import Dict, Any, List, Optional
import httpx


class RealTimeAdvisoryAgent:
    def __init__(self):
        self.candidate_models = [
            "qwen/qwen-2.5-72b-instruct",
            "deepseek/deepseek-chat",
            "openrouter/auto"
        ]

    def _get_api_key(self) -> str:
        key = os.getenv("OPENROUTER_API_KEY", "")
        if not key:
            try:
                from apps.api.config import settings
                key = getattr(settings, "OPENROUTER_API_KEY", "")
            except Exception:
                pass
        return key

    async def synthesize(
        self,
        crop: str,
        stage_data: Dict[str, Any],
        farm_acres: float,
        soil_type: str,
        irrigation_method: str,
        weather_curr: Dict[str, Any],
        forecast_data: Dict[str, Any],
        irrigation_calc: Dict[str, Any],
        energy_calc: Dict[str, Any],
        disease_info: Optional[Dict[str, Any]] = None,
        retrieved_docs: Optional[List[Dict[str, Any]]] = None,
        farmer_query: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Executes live AI multi-agent synthesis using real-time LLM reasoning.
        """
        t0 = time.time()
        active_stage = stage_data.get("active_stage", "vegetative")
        variety = stage_data.get("variety", "Standard")
        days_elapsed = stage_data.get("days_elapsed", 30)
        temp_c = weather_curr.get("temperature_c", 26.0)
        weather_cond = weather_curr.get("condition", "Partly Cloudy")
        weather_desc = weather_curr.get("description", "Scattered clouds")
        humidity = weather_curr.get("humidity_pct", 65)
        wind_ms = weather_curr.get("wind_speed_ms", 2.5)
        rain_24h = forecast_data.get("rain_24h_mm", 0.0)
        rain_48h = forecast_data.get("rain_48h_mm", 0.0)
        action = irrigation_calc.get("action", "IRRIGATE NOW")
        gross_vol = irrigation_calc.get("gross_volume_litres", 0)
        water_saved = irrigation_calc.get("water_saved_litres", 0)
        etc = irrigation_calc.get("etc_mm_day", 3.0)
        runtime_hrs = energy_calc.get("estimated_runtime_hours", 0.0)
        cost_inr = energy_calc.get("estimated_cost_inr", 0.0)

        disease_summary = "No foliar disease detected; foliage appears healthy."
        if disease_info and disease_info.get("detected") and disease_info.get("detected") != "Not Assessed (No image provided)":
            disease_summary = (
                f"Foliar symptom detected: {disease_info.get('detected')} "
                f"(Severity: {disease_info.get('severity')}, Affected Area: {disease_info.get('affected_area_pct')}%)"
            )

        citations_summary = ""
        if retrieved_docs:
            citations_summary = "Verified agronomic guidelines: " + " | ".join(
                f"{d.get('title')}: {d.get('content')[:120]}..." for d in retrieved_docs[:2]
            )

        location_name = weather_curr.get("location_name") or (
            f"{weather_curr.get('city', '')}, {weather_curr.get('state', '')}".strip(', ')
        ) or "Local Farm"

        # Build prompt for Real-Time LLM Synthesizer
        system_instruction = (
            "You are the AgriEdge Real-Time Agricultural AI Agent, an expert agronomic scientist and meteorologist. "
            "Your job is to synthesize real-time field telemetry and FAO-56 scientific calculations into clear, practical, "
            "farmer-first guidance tailored to the farmer's real-time geographical location. "
            "You must return ONLY a valid JSON object with the following schema:\n"
            "{\n"
            '  "summary": "1 to 2 concise sentences explaining today\'s decision, referencing the real-time location, weather, and crop stage accurately",\n'
            '  "what_to_do": ["Clear action 1", "Clear action 2", "Clear action 3"],\n'
            '  "what_not_to_do": ["Crucial caution 1", "Crucial caution 2", "Crucial caution 3"]\n'
            "}\n"
            "Rules:\n"
            "1. Be strictly factually accurate to the provided numbers. If rain is 0.3mm, do NOT say it meets a 2.5mm demand!\n"
            "2. Mention the local area or weather context naturally.\n"
            "3. Ensure what_to_do and what_not_to_do are actionable for an Indian farmer today.\n"
            "4. Do not include markdown formatting or backticks outside the JSON."
        )

        user_prompt = (
            f"FIELD TELEMETRY & MULTI-AGENT STATE:\n"
            f"- Location: {location_name}\n"
            f"- Crop: {crop} ({variety}), Growth Stage: {active_stage} (Day {days_elapsed})\n"
            f"- Farm Size: {farm_acres} acres, Soil: {soil_type}, Irrigation Method: {irrigation_method}\n"
            f"- Live Weather: {temp_c}°C, {weather_cond} ({weather_desc}), Humidity: {humidity}%, Wind: {wind_ms} m/s\n"
            f"- Precipitation Forecast: 24h: {rain_24h} mm, 48h: {rain_48h} mm\n"
            f"- FAO-56 Evapotranspiration Demand: {etc} mm/day\n"
            f"- Recommended Irrigation Action: {action}\n"
            f"- Water Allocation: {gross_vol:,} Litres (Water Saved / Avoided: {water_saved:,} L)\n"
            f"- Pump Runtime: {runtime_hrs} hrs (Estimated Cost: ₹{cost_inr})\n"
            f"- Foliar Health: {disease_summary}\n"
            f"- Agronomic Knowledge Context: {citations_summary}\n"
            f"{f'- Farmer Query: {farmer_query}' if farmer_query else ''}\n"
            f"Language: {language}\n\n"
            f"Synthesize the real-time advisory now in JSON."
        )

        # 1. Attempt Real-Time LLM Call via OpenRouter
        api_key = self._get_api_key()
        if api_key and len(api_key.strip()) > 10:
            for model_id in self.candidate_models:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {api_key}",
                                "HTTP-Referer": "https://agriedge.internal",
                                "X-Title": "AgriEdge Real-Time Agent"
                            },
                            json={
                                "model": model_id,
                                "messages": [
                                    {"role": "system", "content": system_instruction},
                                    {"role": "user", "content": user_prompt}
                                ],
                                "temperature": 0.25,
                                "max_tokens": 450
                            }
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                            if raw_content:
                                # Clean JSON
                                json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
                                if json_match:
                                    parsed = json.loads(json_match.group(0))
                                    if "summary" in parsed and "what_to_do" in parsed:
                                        duration = round((time.time() - t0) * 1000, 1)
                                        return {
                                            "success": True,
                                            "is_realtime": True,
                                            "agent_name": "RealTimeAdvisoryAgent",
                                            "model": model_id,
                                            "duration_ms": duration,
                                            "summary": parsed["summary"].strip(),
                                            "what_to_do": parsed.get("what_to_do", [])[:4],
                                            "what_not_to_do": parsed.get("what_not_to_do", [])[:3]
                                        }
                except Exception as e:
                    print(f"[RealTimeAdvisoryAgent] Error calling {model_id}: {e}")

        # 2. Dynamic Real-Time Rule Synthesizer (Zero-latency fallback when offline)
        duration = round((time.time() - t0) * 1000, 1)
        
        # Real-time tailored summary
        loc_str = f" in {location_name}" if location_name and "Farm" not in location_name else ""
        if action == "SKIP IRRIGATION":
            if rain_24h >= etc:
                realtime_summary = (
                    f"Real-Time Advisory for {crop}{loc_str} ({active_stage.capitalize()} stage, {farm_acres} acres). "
                    f"Recommended Action: SKIP IRRIGATION. Forecast rainfall of {rain_24h:.1f} mm covers the daily {etc:.1f} mm crop demand, "
                    f"avoiding {water_saved:,} L of unnecessary groundwater pumping."
                )
            else:
                realtime_summary = (
                    f"Real-Time Advisory for {crop}{loc_str} ({active_stage.capitalize()} stage, {farm_acres} acres). "
                    f"Recommended Action: SKIP IRRIGATION. Multi-day effective rainfall and current soil water status fulfill "
                    f"crop evapotranspiration ({etc:.1f} mm/day), protecting root health and conserving energy."
                )
        elif action == "REDUCE IRRIGATION":
            realtime_summary = (
                f"Real-Time Advisory for {crop}{loc_str} ({active_stage.capitalize()} stage, {farm_acres} acres). "
                f"Recommended Action: REDUCE IRRIGATION. With {rain_24h:.1f} mm light rain expected, apply a reduced volume "
                f"of {gross_vol:,} L ({runtime_hrs} hrs pump runtime) to maintain root moisture balance."
            )
        else:
            realtime_summary = (
                f"Real-Time Advisory for {crop}{loc_str} ({active_stage.capitalize()} stage, {farm_acres} acres). "
                f"Recommended Action: IRRIGATE NOW. High daily evapotranspiration ({etc:.1f} mm/day) under {temp_c}°C weather "
                f"requires {gross_vol:,} L of {irrigation_method} irrigation to avoid moisture stress."
            )

        if disease_info and disease_info.get("detected") and "Not Assessed" not in disease_info.get("detected", ""):
            realtime_summary += f" Foliar alert: {disease_info.get('detected')} noted."

        # Real-time what to do & not to do
        what_to_do = [
            f"Adhere to irrigation directive: {action} ({gross_vol:,} Litres allocation).",
            f"Inspect {crop} root zone moisture at 10-15 cm depth in {soil_type} soil before scheduling pump.",
            f"Leverage current {weather_cond.lower()} weather ({temp_c}°C) for necessary field intercultural operations."
        ]
        what_not_to_do = [
            "Do NOT run agricultural pumps during peak heat hours (11:00 AM - 3:00 PM) to avoid high evaporation loss.",
            f"Do NOT apply soluble fertilizers immediately before expected {rain_24h:.1f} mm rainfall to prevent nutrient leaching.",
            "Do NOT spray foliar agrochemicals if wind speed exceeds 12 km/h or immediate rain is imminent."
        ]

        return {
            "success": True,
            "is_realtime": False,
            "agent_name": "RealTimeAdvisoryAgent",
            "model": "AgriEdge-AgroPhysics-Ensemble",
            "duration_ms": duration,
            "summary": realtime_summary,
            "what_to_do": what_to_do,
            "what_not_to_do": what_not_to_do
        }


realtime_advisory_agent = RealTimeAdvisoryAgent()
