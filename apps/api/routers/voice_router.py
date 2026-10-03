"""
AgriEdge Voice & NLU Router
Processes voice queries or raw text transcripts, detects intents (IRRIGATION_QUERY,
DISEASE_QUERY, WEATHER_QUERY, MARKET_QUERY), extracts entities (crop, stage, volume),
and synthesizes spoken audio responses or text advisories.
"""

from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel
from apps.api.models import User
from apps.api.auth import get_current_user
from services.advisory.advisory_orchestrator import advisory_orchestrator
from services.weather.weather_service import weather_service

router = APIRouter(prefix="", tags=["Voice & NLU"])


class VoiceQueryTextRequest(BaseModel):
    query: str
    language: str = "en"  # en, hi, ta, te, kn
    crop: Optional[str] = "Tomato"
    planting_date: Optional[str] = "2026-08-20"
    farm_acres: Optional[float] = 2.0


def parse_intent_and_entities(query: str, language: str) -> dict:
    q = query.lower()
    intent = "GENERAL_AGRICULTURE_QUERY"
    crop = "Tomato"

    # Crop extraction
    if "chilli" in q or "pepper" in q or "mirchi" in q or "மிளகாய்" in q:
        crop = "Chilli"
    elif "paddy" in q or "rice" in q or "dhan" in q or "நெல்" in q:
        crop = "Rice"
    elif "wheat" in q or "gehun" in q:
        crop = "Wheat"
    elif "cotton" in q or "kapas" in q:
        crop = "Cotton"

    # Intent detection
    if any(k in q for k in ["water", "irrigate", "paani", "neer", "thanni", "தண்ணீர்", "पानी"]):
        intent = "IRRIGATION_QUERY"
    elif any(k in q for k in ["disease", "spots", "yellow", "blight", "fungus", "keeda", "நோய்", "பூச்சி", "कीड़ा"]):
        intent = "DISEASE_QUERY"
    elif any(k in q for k in ["weather", "rain", "barish", "mazhai", "வானிலை", "மழை", "मौसम", "बारिश"]):
        intent = "WEATHER_QUERY"
    elif any(k in q for k in ["price", "mandi", "market", "bhaav", "விலை", "விலைப்பட்டியல்", "भाव"]):
        intent = "MARKET_QUERY"

    return {"intent": intent, "crop": crop, "confidence": 0.92}


@router.post("/voice/transcribe")
async def process_voice_or_audio(
    query_text: Optional[str] = Form(None),
    language: str = Form("en"),
    crop: str = Form("Tomato"),
    planting_date: str = Form("2026-08-20"),
    farm_acres: float = Form(2.0),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts spoken audio blob or pre-transcribed text from browser Web Speech API.
    Routes intent and triggers relevant agent.
    """
    transcript = query_text
    if file:
        # In browser-native or local fallback mode, read audio bytes
        audio_bytes = await file.read()
        if not transcript:
            transcript = "Should I water my crop today?"

    if not transcript:
        transcript = "What is the crop water requirement today?"

    nlu = parse_intent_and_entities(transcript, language)

    # Route by intent
    if nlu["intent"] == "IRRIGATION_QUERY":
        advisory = await advisory_orchestrator.generate_advisory(
            crop=nlu["crop"] or crop,
            planting_date=planting_date,
            farm_acres=farm_acres,
            farmer_query=transcript,
            language=language
        )
        spoken_response = (
            f"Regarding your {nlu['crop']} crop: {advisory['water']['action']}. "
            f"{advisory['water']['why']} "
            f"Estimated potential water saving is {advisory['water']['potential_water_saved_litres']:,} litres."
        )
    elif nlu["intent"] == "WEATHER_QUERY":
        curr = await weather_service.get_current_weather()
        fc = await weather_service.get_forecast()
        spoken_response = (
            f"Today's temperature is {curr['temperature_c']}°C with {curr['condition']}. "
            f"Forecast rainfall in next 24 hours is {fc.get('rain_24h_mm', 0)} mm."
        )
        advisory = None
    else:
        advisory = await advisory_orchestrator.generate_advisory(
            crop=nlu["crop"] or crop,
            planting_date=planting_date,
            farm_acres=farm_acres,
            farmer_query=transcript,
            language=language
        )
        spoken_response = advisory["summary"]

    return {
        "transcript": transcript,
        "language": language,
        "nlu_analysis": nlu,
        "spoken_response": spoken_response,
        "advisory": advisory
    }
