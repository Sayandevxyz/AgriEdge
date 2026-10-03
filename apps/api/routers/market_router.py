"""
AgriEdge Market & Post-Harvest Router
Provides APMC / Agmarknet market data (or explicit fallback note if unconfigured),
and post-harvest storage and cold chain booking interfaces.
"""

from fastapi import APIRouter, Query
from services.market.market_service import market_agent

router = APIRouter(prefix="", tags=["Market & Post-Harvest"])


@router.get("/market")
async def get_market_intelligence(
    crop: str = Query("Tomato", description="Crop name"),
    market: str = Query("APMC Mandi", description="Market name")
):
    return await market_agent.get_market_data(crop=crop, market=market)


@router.get("/market/cold-storage")
async def get_cold_storage_facilities(district: str = Query("Ramanagara")):
    return await market_agent.cold_storage.check_availability(district=district, commodity="Vegetables")
