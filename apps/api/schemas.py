"""
AgriEdge Pydantic Validation & Serialization Schemas
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field


# Auth Schemas
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    phone_number: Optional[str] = None
    role: str = "FARMER"  # FARMER, FPO_ADMIN, AGRONOMIST, SYSTEM_ADMIN
    language_preference: str = "en"


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    role: str
    language_preference: str


# Farm & Onboarding Schemas
class FarmCreateRequest(BaseModel):
    farm_name: str
    total_area_acres: float
    crop_name: str
    planting_date: str  # YYYY-MM-DD
    variety: Optional[str] = "Standard"
    soil_type: str = "loam"
    irrigation_type: str = "drip"
    pump_hp: float = 5.0
    pump_type: str = "electric"
    discharge_rate_lps: float = 8.0
    village: str
    district: str
    state: str = "Karnataka"
    latitude: Optional[float] = 12.97
    longitude: Optional[float] = 77.59


class FarmResponse(BaseModel):
    id: int
    farm_name: str
    total_area_acres: float
    soil_type: str
    irrigation_type: str
    pump_hp: float
    pump_type: str
    discharge_rate_lps: float
    village: Optional[str]
    district: Optional[str]
    active_crop: Optional[str] = None
    planting_date: Optional[str] = None
    current_stage: Optional[str] = None

    class Config:
        from_attributes = True


# Advisory Generation Request
class AdvisoryRequest(BaseModel):
    crop: str
    planting_date: str
    farm_acres: float = 2.0
    soil_type: str = "loam"
    irrigation_method: str = "drip"
    pump_hp: float = 5.0
    pump_type: str = "electric"
    discharge_lps: float = 8.0
    latitude: float = 12.97
    longitude: float = 77.59
    farmer_query: Optional[str] = None
    language: str = "en"
    stage_override: Optional[str] = None


# Scenario Request
class ScenarioSimulateRequest(BaseModel):
    crop: str = "Tomato"
    growth_stage: str = "flowering"
    farm_acres: float = 2.0
    et0_mm: Optional[float] = None
    pump_hp: float = 5.0
    forecast_rain_24h_mm: Optional[float] = None
    forecast_rain_48h_mm: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# Feedback & Outcome Request
class FeedbackSubmitRequest(BaseModel):
    advisory_id: str
    predicted_action: str
    action_taken: str
    water_used_litres: Optional[float] = None
    predicted_water_litres: Optional[float] = None
    energy_used_kwh: Optional[float] = None
    predicted_energy_kwh: Optional[float] = None
    crop_condition: str = "Improved"
    yield_outcome_kg: Optional[float] = None
    farmer_comment: Optional[str] = None


# Structured Error Response
class ErrorDetail(BaseModel):
    code: str
    message: str


class StandardAPIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None
