"""
AgriEdge Core FastAPI Application Entrypoint
"Save Water. Save Energy. Grow Smarter."
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apps.api.config import settings
from apps.api.database import engine, Base, SessionLocal
from apps.api.models import User, FPO, FarmerProfile, Farm, Crop
from apps.api.auth import hash_password
from services.location.location_service import location_service

# Import Routers
from apps.api.routers.auth_router import router as auth_router
from apps.api.routers.farmer_router import router as farmer_router
from apps.api.routers.advisory_router import router as advisory_router
from apps.api.routers.vision_router import router as vision_router
from apps.api.routers.voice_router import router as voice_router
from apps.api.routers.weather_router import router as weather_router
from apps.api.routers.scenario_router import router as scenario_router
from apps.api.routers.market_router import router as market_router
from apps.api.routers.feedback_router import router as feedback_router
from apps.api.routers.fpo_router import router as fpo_router
from apps.api.routers.admin_router import router as admin_router
from apps.api.routers.health_router import router as health_router
from apps.api.routers.location_router import router as location_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create all database tables on configured engine (PostgreSQL / SQLite)
    Base.metadata.create_all(bind=engine)

    # 1b. Non-destructive column additions for existing PostgreSQL and SQLite databases
    with engine.connect() as conn:
        from sqlalchemy import text
        is_postgres = "postgres" in str(engine.url).lower()
        if is_postgres:
            statements = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT TRUE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP WITH TIME ZONE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20)",
                "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS curated_by VARCHAR(120)",
                "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS curation_notes TEXT",
                "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS curated_at TIMESTAMP WITH TIME ZONE",
                "UPDATE users SET consent_given = TRUE WHERE consent_given IS NULL OR consent_given = FALSE"
            ]
        else:
            statements = [
                "ALTER TABLE users ADD COLUMN consent_given BOOLEAN DEFAULT 1",
                "ALTER TABLE users ADD COLUMN consent_timestamp DATETIME",
                "ALTER TABLE users ADD COLUMN consent_version VARCHAR(20)",
                "ALTER TABLE feedbacks ADD COLUMN curated_by VARCHAR(120)",
                "ALTER TABLE feedbacks ADD COLUMN curation_notes TEXT",
                "ALTER TABLE feedbacks ADD COLUMN curated_at DATETIME",
                "UPDATE users SET consent_given = 1 WHERE consent_given IS NULL OR consent_given = 0"
            ]

        for col_stmt in statements:
            try:
                conn.execute(text(col_stmt))
                conn.commit()
            except Exception as e:
                try:
                    conn.rollback()
                except Exception:
                    pass

    # 2. Seed development records ONLY when APP_MODE == "development" (in production seed nothing)
    if settings.APP_MODE == "development":
        db = SessionLocal()
        try:
            existing_user = db.query(User).first()
            if not existing_user:
                # Read seed password from environment variable SEED_PASSWORD
                seed_pwd = os.getenv("SEED_PASSWORD") or settings.SEED_PASSWORD or "agriedge2026"

                # Seed FPO
                fpo = FPO(
                    name="Cauvery Basin Farmer Producer Organization",
                    code="FPO_KA_01",
                    district="Mandya",
                    state="Karnataka",
                    total_member_farmers=342
                )
                db.add(fpo)
                db.commit()
                db.refresh(fpo)

                # Seed Farmer User
                farmer_user = User(
                    email="ramesh.farmer@agriedge.internal",
                    hashed_password=hash_password(seed_pwd),
                    full_name="Ramesh Gowda",
                    phone_number="+91 98450 12345",
                    role="FARMER",
                    language_preference="en",
                    consent_given=True,
                    consent_version="dpdp-v1.0"
                )
                db.add(farmer_user)

                # Seed FPO Admin User
                fpo_user = User(
                    email="admin.cauveryfpo@agriedge.internal",
                    hashed_password=hash_password(seed_pwd),
                    full_name="Dr. H. M. Shivakumar (FPO Agronomist)",
                    phone_number="+91 94480 54321",
                    role="FPO_ADMIN",
                    language_preference="en",
                    consent_given=True,
                    consent_version="dpdp-v1.0"
                )
                db.add(fpo_user)

                # Seed System Admin User
                admin_user = User(
                    email="admin@agriedge.internal",
                    hashed_password=hash_password(seed_pwd),
                    full_name="System Administrator",
                    phone_number="+91 90000 00000",
                    role="SYSTEM_ADMIN",
                    language_preference="en",
                    consent_given=True,
                    consent_version="dpdp-v1.0"
                )
                db.add(admin_user)
                db.commit()

                # Detect real-time location dynamically with offline Chennai fallback
                try:
                    live_loc = await location_service.detect_ip_location()
                    v_name = live_loc.get("village", "Chennai")
                    d_name = live_loc.get("district", "Chennai")
                    s_name = live_loc.get("state", "Tamil Nadu")
                    lat_val = live_loc.get("latitude", 13.0895)
                    lon_val = live_loc.get("longitude", 80.2739)
                except Exception:
                    v_name = "Chennai"
                    d_name = "Chennai"
                    s_name = "Tamil Nadu"
                    lat_val = 13.0895
                    lon_val = 80.2739

                # Seed Farmer Profile & Farm
                profile = FarmerProfile(
                    user_id=farmer_user.id,
                    fpo_id=fpo.id,
                    village=v_name,
                    block=v_name,
                    district=d_name,
                    state=s_name,
                    latitude=lat_val,
                    longitude=lon_val
                )
                db.add(profile)
                db.commit()
                db.refresh(profile)

                farm = Farm(
                    farmer_id=profile.id,
                    fpo_id=fpo.id,
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
                    variety="Arka Rakshak (High-Yielding)",
                    planting_date="2026-08-20",
                    current_stage="flowering",
                    season="Kharif",
                    is_active=True
                )
                db.add(crop)
                db.commit()
                print(f"[AgriEdge] Seeded database entities with real-time location: {v_name}, {d_name}.")
            else:
                # Upgrade existing legacy farm location if matching old Channapatna default
                existing_farm = db.query(Farm).first()
                if existing_farm and (existing_farm.village == "Channapatna" or abs(existing_farm.latitude - 12.651) < 0.01):
                    try:
                        live_loc = await location_service.detect_ip_location()
                        existing_farm.village = live_loc.get("village", existing_farm.village)
                        existing_farm.district = live_loc.get("district", existing_farm.district)
                        existing_farm.latitude = live_loc.get("latitude", existing_farm.latitude)
                        existing_farm.longitude = live_loc.get("longitude", existing_farm.longitude)
                        existing_farm.farm_name = f"Ramesh {existing_farm.village} Farm"
                        db.commit()
                        print(f"[AgriEdge] Upgraded existing farm to live real-time location: {existing_farm.village}, {existing_farm.district}.")
                    except Exception as e:
                        print(f"[AgriEdge] Farm location upgrade skipped: {e}")
        except Exception as e:
            print(f"[AgriEdge] Startup seeding note: {e}")
        finally:
            db.close()

    yield


app = FastAPI(
    title="AgriEdge API",
    description="Farmer-Owned Intelligence for Water, Energy & Crop Productivity. Combines FAO-56 Penman-Monteith, leaf vision diagnosis, weather intelligence, and FPO aggregation.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration (Allows configured origins and regex patterns for Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_trace = traceback.format_exc()
    print(f"[AgriEdge 500 Error] {request.method} {request.url.path}: {exc}\n{error_trace}")

    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"

    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": f"Server error: {str(exc)}"
            }
        },
        headers=headers
    )

# Mount Health Check Endpoints
app.include_router(health_router)

# Mount Version 1 APIs
API_V1_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_V1_PREFIX)
app.include_router(farmer_router, prefix=API_V1_PREFIX)
app.include_router(advisory_router, prefix=API_V1_PREFIX)
app.include_router(vision_router, prefix=API_V1_PREFIX)
app.include_router(voice_router, prefix=API_V1_PREFIX)
app.include_router(weather_router, prefix=API_V1_PREFIX)
app.include_router(scenario_router, prefix=API_V1_PREFIX)
app.include_router(market_router, prefix=API_V1_PREFIX)
app.include_router(feedback_router, prefix=API_V1_PREFIX)
app.include_router(fpo_router, prefix=API_V1_PREFIX)
app.include_router(admin_router, prefix=API_V1_PREFIX)
app.include_router(location_router, prefix=API_V1_PREFIX)


@app.get("/")
def root_status():
    return {
        "app": "AgriEdge Core API",
        "tagline": "Save Water. Save Energy. Grow Smarter.",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "mode": settings.APP_MODE,
        "database": "PostgreSQL (Neon Cloud)" if "postgres" in settings.DATABASE_URL else "SQLite",
        "docs": "/docs"
    }
