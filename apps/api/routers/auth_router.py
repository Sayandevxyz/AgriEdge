"""
AgriEdge Authentication Router
Handles registration, login, JWT token issuance, token refresh, and Judge / Demo mode quick login.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import jwt
from apps.api.config import settings
from apps.api.database import get_db
from apps.api.models import User, FarmerProfile, Farm, Crop
from apps.api.schemas import (
    UserRegisterRequest,
    AdminUserCreateRequest,
    UserLoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    StandardAPIResponse,
    ConsentUpdateRequest
)
from apps.api.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    require_roles
)
from apps.api.rate_limiter import rate_limit

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60, key_prefix="auth_register"))]
)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Public registration endpoint.
    Strictly forces role='FARMER'. Only SYSTEM_ADMIN may create other roles via protected endpoint.
    Takes village/district/lat/lon from signup or fallback.
    """
    norm_email = req.email.lower().strip()
    existing = db.query(User).filter(User.email == norm_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": "An account with this email address already exists."}
        )

    # Force role="FARMER" for public registration regardless of any client inputs
    user = User(
        email=norm_email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        phone_number=req.phone_number,
        role="FARMER",
        language_preference=req.language_preference,
        consent_given=req.consent_given,
        consent_timestamp=datetime.now(timezone.utc) if req.consent_given else None,
        consent_version=req.consent_version or "dpdp-v1.0"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create farmer profile with requested or fallback location (item 13)
    v_name = req.village or "Chennai"
    d_name = req.district or "Chennai"
    s_name = req.state or "Tamil Nadu"
    lat_val = req.latitude if req.latitude is not None else 13.0895
    lon_val = req.longitude if req.longitude is not None else 80.2739

    profile = FarmerProfile(
        user_id=user.id,
        village=v_name,
        district=d_name,
        state=s_name,
        latitude=lat_val,
        longitude=lon_val
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
        language_preference=user.language_preference,
        consent_given=user.consent_given
    )


@router.post(
    "/admin/users",
    response_model=TokenResponse,
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))]
)
def admin_create_user(req: AdminUserCreateRequest, db: Session = Depends(get_db)):
    """
    Protected endpoint accessible only by SYSTEM_ADMIN to create users with any role.
    """
    norm_email = req.email.lower().strip()
    existing = db.query(User).filter(User.email == norm_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": "An account with this email address already exists."}
        )

    assigned_role = req.role.upper().strip()
    user = User(
        email=norm_email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        phone_number=req.phone_number,
        role=assigned_role,
        language_preference=req.language_preference
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if assigned_role == "FARMER":
        v_name = req.village or "Chennai"
        d_name = req.district or "Chennai"
        s_name = req.state or "Tamil Nadu"
        lat_val = req.latitude if req.latitude is not None else 13.0895
        lon_val = req.longitude if req.longitude is not None else 80.2739

        profile = FarmerProfile(
            user_id=user.id,
            village=v_name,
            district=d_name,
            state=s_name,
            latitude=lat_val,
            longitude=lon_val
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
        language_preference=user.language_preference,
        consent_given=user.consent_given
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(max_requests=15, window_seconds=60, key_prefix="auth_login"))]
)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    norm_email = req.email.lower().strip()
    user = db.query(User).filter(User.email == norm_email).first()
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
        language_preference=user.language_preference,
        consent_given=user.consent_given
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Validates refresh token (type == 'refresh') and issues a fresh access & refresh token pair.
    """
    try:
        payload = jwt.decode(
            req.refresh_token,
            settings.JWT_REFRESH_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_TOKEN_TYPE", "message": "Provided token is not a valid refresh token."}
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_TOKEN", "message": "Invalid token subject."}
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_OR_EXPIRED_TOKEN", "message": "Refresh token has expired or is invalid."}
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "USER_NOT_FOUND", "message": "User account is inactive or not found."}
        )

    token_data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        language_preference=user.language_preference,
        consent_given=user.consent_given
    )


@router.post("/demo-login/{role}", response_model=TokenResponse)
def demo_login(role: str, db: Session = Depends(get_db)):
    """
    Demo / Judge Mode quick login to test user journeys.
    Only enabled when settings.APP_MODE == 'development' or settings.ENABLE_DEMO_LOGIN == True.
    Never allows SYSTEM_ADMIN via demo login in production.
    """
    if settings.APP_MODE != "development" and not settings.ENABLE_DEMO_LOGIN:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DEMO_LOGIN_DISABLED", "message": "Demo login is disabled in production."}
        )

    role_normalized = role.upper().strip()
    if role_normalized not in ["FARMER", "FPO_ADMIN", "SYSTEM_ADMIN"]:
        role_normalized = "FARMER"

    if settings.APP_MODE == "production" and role_normalized == "SYSTEM_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "SYSTEM_ADMIN_DEMO_FORBIDDEN", "message": "SYSTEM_ADMIN demo login is strictly disabled in production."}
        )

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
        language_preference=user.language_preference,
        consent_given=user.consent_given
    )


@router.post("/consent")
def update_user_consent(
    req: ConsentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates or confirms DPDP-compliant user consent for telemetry and image processing.
    """
    current_user.consent_given = req.consent_given
    current_user.consent_timestamp = datetime.now(timezone.utc) if req.consent_given else None
    current_user.consent_version = req.consent_version
    db.commit()
    db.refresh(current_user)
    return {
        "status": "SUCCESS",
        "consent_given": current_user.consent_given,
        "consent_timestamp": current_user.consent_timestamp,
        "consent_version": current_user.consent_version
    }


@router.get("/config")
def get_auth_config():
    """
    Returns authentication and runtime environment capabilities:
    - demo_enabled: True if APP_MODE == 'development' or ENABLE_DEMO_LOGIN is True
    - app_mode: Current application mode ('development' or 'production')
    """
    demo_enabled = (settings.APP_MODE == "development" or settings.ENABLE_DEMO_LOGIN)
    return {
        "demo_enabled": demo_enabled,
        "app_mode": settings.APP_MODE
    }
