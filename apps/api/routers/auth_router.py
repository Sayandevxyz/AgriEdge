"""
AgriEdge Authentication Router
Handles registration, login, JWT token issuance, and Judge / Demo mode quick login.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import User, FarmerProfile, Farm, Crop
from apps.api.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, StandardAPIResponse
from apps.api.auth import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": "An account with this email address already exists."}
        )

    user = User(
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        phone_number=req.phone_number,
        role=req.role.upper(),
        language_preference=req.language_preference
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If role is FARMER, create default profile
    if user.role == "FARMER":
        profile = FarmerProfile(
            user_id=user.id,
            village="Mandya Rural",
            district="Mandya",
            state="Karnataka",
            latitude=12.52,
            longitude=76.89
        )
        db.add(profile)
        db.commit()

    token_data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        language_preference=user.language_preference
    )


@router.post("/login", response_model=TokenResponse)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."}
        )

    token_data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        language_preference=user.language_preference
    )


@router.post("/demo-login/{role}", response_model=TokenResponse)
def demo_login(role: str, db: Session = Depends(get_db)):
    """
    Demo / Judge Mode quick login to test user journeys.
    Explicitly labeled as Local Development Demo.
    """
    role_normalized = role.upper().strip()
    if role_normalized not in ["FARMER", "FPO_ADMIN", "SYSTEM_ADMIN"]:
        role_normalized = "FARMER"

    email_map = {
        "FARMER": "ramesh.farmer@agriedge.internal",
        "FPO_ADMIN": "admin.cauveryfpo@agriedge.internal",
        "SYSTEM_ADMIN": "admin@agriedge.internal"
    }
    demo_email = email_map.get(role_normalized, "ramesh.farmer@agriedge.internal")
    user = db.query(User).filter(User.email == demo_email).first()

    if not user:
        # Auto-seed demo user if not yet initialized
        user = User(
            email=demo_email,
            hashed_password=hash_password("agriedge2026"),
            full_name="Ramesh Gowda (Farmer Demo)" if role_normalized == "FARMER" else ("Cauvery FPO Manager" if role_normalized == "FPO_ADMIN" else "System Lead"),
            role=role_normalized,
            language_preference="en"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        if role_normalized == "FARMER":
            import asyncio
            from services.location.location_service import location_service
            try:
                # detect IP location
                live_loc = asyncio.run(location_service.detect_ip_location())
                v_name = live_loc.get("village", "Chennai")
                d_name = live_loc.get("district", "Chennai")
                lat_val = live_loc.get("latitude", 13.0895)
                lon_val = live_loc.get("longitude", 80.2739)
            except Exception:
                v_name = "Local Farm"
                d_name = "Local District"
                lat_val = 13.0895
                lon_val = 80.2739

            profile = FarmerProfile(
                user_id=user.id,
                village=v_name,
                district=d_name,
                latitude=lat_val,
                longitude=lon_val
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

            farm = Farm(
                farmer_id=profile.id,
                farm_name=f"Ramesh {v_name} Farm",
                total_area_acres=2.0,
                soil_type="loam",
                irrigation_type="drip",
                pump_hp=5.0,
                pump_type="electric",
                discharge_rate_lps=8.0,
                village=v_name,
                district=d_name,
                latitude=lat_val,
                longitude=lon_val
            )
            db.add(farm)
            db.commit()
            db.refresh(farm)

            crop = Crop(
                farm_id=farm.id,
                crop_name="Tomato",
                variety="Arka Rakshak (Hybrid)",
                planting_date="2026-08-20",
                current_stage="flowering",
                season="Kharif"
            )
            db.add(crop)
            db.commit()

    token_data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        language_preference=user.language_preference
    )
