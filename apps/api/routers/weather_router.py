"""
AgriEdge Weather Router
Provides current agro-meteorological metrics and precipitation forecasts with real-time location detection.
"""

from typing import Optional
from fastapi import APIRouter, Query
from services.weather.weather_service import weather_service
from services.weather.rainfall_agent import RainfallAgent
from services.location.location_service import location_service

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/current")
async def get_current_weather(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
):
    if lat is None or lon is None:
        ip_loc = await location_service.detect_ip_location()
        lat = ip_loc["latitude"]
        lon = ip_loc["longitude"]
    return await weather_service.get_current_weather(lat=lat, lon=lon)


@router.get("/forecast")
async def get_forecast(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
):
    if lat is None or lon is None:
        ip_loc = await location_service.detect_ip_location()
        lat = ip_loc["latitude"]
        lon = ip_loc["longitude"]
    curr = await weather_service.get_current_weather(lat=lat, lon=lon)
    fc = await weather_service.get_forecast(lat=lat, lon=lon)
    analysis = RainfallAgent.analyze_rainfall_profile(
        forecast_days=fc.get("forecast_days", []),
        current_condition=curr.get("condition", "")
    )
    return {
        **fc,
        "location": curr.get("location"),
        "location_name": curr.get("location_name"),
        "rainfall_analysis": analysis
    }
