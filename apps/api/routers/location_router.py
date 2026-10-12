"""
AgriEdge Real-Time Location Router
Provides endpoints to detect user physical location, reverse-geocode coordinates,
and supply real-time geographical context to all agricultural agents.
"""

from fastapi import APIRouter, Query, HTTPException
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


@router.get("/location/reverse-geocode")
async def reverse_geocode_location_get(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    latitude: Optional[float] = Query(None, description="Latitude (alias)"),
    longitude: Optional[float] = Query(None, description="Longitude (alias)")
):
    """
    Reverse-geocodes client GPS coordinates provided via GET query params.
    """
    target_lat = lat if lat is not None else latitude
    target_lon = lon if lon is not None else longitude
    if target_lat is None or target_lon is None:
        raise HTTPException(
            status_code=400,
            detail={"code": "COORDINATES_REQUIRED", "message": "Query parameters 'lat' and 'lon' are required."}
        )
    return await location_service.reverse_geocode(target_lat, target_lon)


@router.post("/location/reverse-geocode")
async def reverse_geocode_location(req: ReverseGeocodeRequest):
    """
    Reverse-geocodes client GPS coordinates to human-readable administrative locality.
    """
    return await location_service.reverse_geocode(req.latitude, req.longitude)
