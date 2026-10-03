"""
AgriEdge SQLAlchemy Database Models
Contains schemas for User, Role, FarmerProfile, FPO, Farm, Crop,
Advisory, WeatherObservation, Feedback, Outcome, and System Events.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from apps.api.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    phone_number = Column(String(30), nullable=True)
    role = Column(String(30), default="FARMER", nullable=False)  # FARMER, FPO_ADMIN, AGRONOMIST, SYSTEM_ADMIN
    language_preference = Column(String(10), default="en")  # en, hi, ta, te, mr, bn, kn
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False)


class FPO(Base):
    __tablename__ = "fpos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), unique=True, index=True)
    district = Column(String(100), nullable=False)
    state = Column(String(100), default="Karnataka")
    total_member_farmers = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    farms = relationship("Farm", back_populates="fpo")


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fpo_id = Column(Integer, ForeignKey("fpos.id"), nullable=True)
    village = Column(String(100), nullable=False)
    block = Column(String(100), nullable=True)
    district = Column(String(100), nullable=False)
    state = Column(String(100), default="Karnataka")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    preferred_communication = Column(String(20), default="APP")  # APP, SMS, WHATSAPP
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="farmer_profile")
    farms = relationship("Farm", back_populates="farmer")


class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    fpo_id = Column(Integer, ForeignKey("fpos.id"), nullable=True)
    farm_name = Column(String(100), nullable=False)
    total_area_acres = Column(Float, nullable=False)
    soil_type = Column(String(50), default="loam")
    irrigation_type = Column(String(50), default="drip")  # drip, sprinkler, flood
    pump_hp = Column(Float, default=5.0)
    pump_type = Column(String(30), default="electric")  # electric, diesel
    discharge_rate_lps = Column(Float, default=8.0)
    village = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    latitude = Column(Float, default=12.97)
    longitude = Column(Float, default=77.59)
    created_at = Column(DateTime, default=datetime.utcnow)

    farmer = relationship("FarmerProfile", back_populates="farms")
    fpo = relationship("FPO", back_populates="farms")
    crops = relationship("Crop", back_populates="farm")


class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    crop_name = Column(String(50), nullable=False)
    variety = Column(String(50), nullable=True)
    planting_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    current_stage = Column(String(50), default="vegetative")
    season = Column(String(30), default="Kharif")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    farm = relationship("Farm", back_populates="crops")
    advisories = relationship("Advisory", back_populates="crop")


class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(Integer, primary_key=True, index=True)
    advisory_uuid = Column(String(50), unique=True, index=True, nullable=False)
    crop_id = Column(Integer, ForeignKey("crops.id"), nullable=False)
    crop_name = Column(String(50), nullable=False)
    growth_stage = Column(String(50), nullable=False)
    
    # Decisions & Calculations
    irrigation_action = Column(String(50), nullable=False)  # SKIP IRRIGATION, IRRIGATE NOW, etc.
    urgency = Column(String(20), default="medium")
    estimated_water_litres = Column(Float, default=0.0)
    potential_water_saved_litres = Column(Float, default=0.0)
    estimated_energy_kwh = Column(Float, default=0.0)
    potential_energy_saved_kwh = Column(Float, default=0.0)
    estimated_cost_inr = Column(Float, default=0.0)
    potential_cost_saved_inr = Column(Float, default=0.0)
    
    # Crop health & Disease
    disease_detected = Column(String(100), nullable=True)
    disease_confidence = Column(Float, default=0.0)
    disease_severity = Column(String(30), default="None")
    
    # Content
    summary = Column(Text, nullable=False)
    why_rationale = Column(Text, nullable=False)
    treatment_recommendations = Column(Text, nullable=True)
    full_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    crop = relationship("Crop", back_populates="advisories")
    feedbacks = relationship("Feedback", back_populates="advisory")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    feedback_uuid = Column(String(50), unique=True, index=True, nullable=False)
    advisory_id = Column(Integer, ForeignKey("advisories.id"), nullable=True)
    advisory_uuid = Column(String(50), nullable=True)
    action_taken = Column(String(150), nullable=False)
    water_used_litres = Column(Float, nullable=True)
    energy_used_kwh = Column(Float, nullable=True)
    crop_condition_after = Column(String(50), default="Improved")
    yield_outcome_kg = Column(Float, nullable=True)
    farmer_comment = Column(Text, nullable=True)
    curated_for_retraining = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    advisory = relationship("Advisory", back_populates="feedbacks")


class SystemAuditLog(Base):
    __tablename__ = "system_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)
    agent_name = Column(String(50), nullable=True)
    request_id = Column(String(50), nullable=True)
    duration_ms = Column(Float, default=0.0)
    status = Column(String(20), default="SUCCESS")
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
