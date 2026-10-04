"""
AgriEdge Market & Post-Harvest Router
Provides real-time APMC commodity pricing, price arbitrage across neighboring mandis,
and post-harvest storage and cold chain booking interfaces with live location support.
"""

from typing import Optional
from fastapi import APIRouter, Query
from services.market.market_service import market_agent

router = APIRouter(prefix="", tags=["Market & Post-Harvest"])


@router.get("/market")
async def get_market_intelligence(
    crop: str = Query("Tomato", description="Crop name"),
    market: Optional[str] = Query(None, description="Market name"),
    district: Optional[str] = Query(None, description="District name"),
    state: Optional[str] = Query(None, description="State name"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
):
    return await market_agent.get_market_data(
        crop=crop,
        market=market,
        district=district,
        state=state,
        latitude=lat,
        longitude=lon
    )


@router.get("/market/cold-storage")
async def get_cold_storage_facilities(
    district: Optional[str] = Query(None, description="District name"),
    commodity: str = Query("Vegetables", description="Crop or commodity")
):
    target_district = district or "Central Agricultural Hub"
    return await market_agent.cold_storage.check_availability(
        district=target_district,
        commodity=commodity
    )
