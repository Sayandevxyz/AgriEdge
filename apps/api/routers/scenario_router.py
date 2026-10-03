"""
AgriEdge Scenario Simulation Router
Allows farmers and agronomists to simulate choices like 'Wait 2 days',
'Reduce irrigation by 20%', or 'What if heavy rainfall occurs?'.
"""

from fastapi import APIRouter
from apps.api.schemas import ScenarioSimulateRequest
from services.scenario.scenario_service import scenario_agent

router = APIRouter(prefix="", tags=["Scenario Simulation"])


@router.post("/scenario/simulate")
def simulate_scenario_endpoint(req: ScenarioSimulateRequest):
    return scenario_agent.simulate_scenarios(
        crop=req.crop,
        growth_stage=req.growth_stage,
        farm_acres=req.farm_acres,
        et0_mm=req.et0_mm,
        pump_hp=req.pump_hp,
        forecast_rain_24h_mm=req.forecast_rain_24h_mm,
        forecast_rain_48h_mm=req.forecast_rain_48h_mm
    )
