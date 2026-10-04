"""
AgriEdge Real-Time Location Router
Provides endpoints to detect user physical location, reverse-geocode coordinates,
and supply real-time geographical context to all agricultural agents.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.location.location_service import location_service

router = APIRouter(prefix="", tags=["Location & Geocoding"])


class ReverseGeocodeRequest(BaseModel):
    latitude: float
    longitude: float


@router.get("/location/detect")
async def detect_location():
    """
    Detects real-time physical location using IP geolocation with reverse geocoding.
    """
    return await location_service.detect_ip_location()


@router.post("/location/reverse-geocode")
async def reverse_geocode_location(req: ReverseGeocodeRequest):
    """
    Reverse-geocodes client GPS coordinates to human-readable administrative locality.
    """
    return await location_service.reverse_geocode(req.latitude, req.longitude)
