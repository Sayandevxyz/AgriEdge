"""
AgriEdge Scenario Simulation Router
Allows farmers and agronomists to simulate choices like 'Wait 2 days',
'Reduce irrigation by 20%', or 'What if heavy rainfall occurs?'.
Supports live real-time meteorological synchronization.
"""

from fastapi import APIRouter
from apps.api.schemas import ScenarioSimulateRequest
from services.scenario.scenario_service import scenario_agent

router = APIRouter(prefix="", tags=["Scenario Simulation"])


@router.post("/scenario/simulate")
async def simulate_scenario_endpoint(req: ScenarioSimulateRequest):
    return await scenario_agent.simulate_realtime_scenarios(
        crop=req.crop,
        growth_stage=req.growth_stage,
        farm_acres=req.farm_acres,
        pump_hp=req.pump_hp,
        latitude=req.latitude,
        longitude=req.longitude,
        et0_override=req.et0_mm,
        rain_24h_override=req.forecast_rain_24h_mm,
        rain_48h_override=req.forecast_rain_48h_mm
    )
