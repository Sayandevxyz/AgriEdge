"""
AgriEdge Weather Router
Provides current agro-meteorological metrics and precipitation forecasts.
"""

from fastapi import APIRouter, Query
from services.weather.weather_service import weather_service
from services.weather.rainfall_agent import RainfallAgent

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/current")
async def get_current_weather(
    lat: float = Query(12.97, description="Latitude"),
    lon: float = Query(77.59, description="Longitude")
):
    return await weather_service.get_current_weather(lat=lat, lon=lon)


@router.get("/forecast")
async def get_forecast(
    lat: float = Query(12.97, description="Latitude"),
    lon: float = Query(77.59, description="Longitude")
):
    curr = await weather_service.get_current_weather(lat=lat, lon=lon)
    fc = await weather_service.get_forecast(lat=lat, lon=lon)
    analysis = RainfallAgent.analyze_rainfall_profile(
        forecast_days=fc.get("forecast_days", []),
        current_condition=curr.get("condition", "")
    )
    return {
        **fc,
        "rainfall_analysis": analysis
    }
