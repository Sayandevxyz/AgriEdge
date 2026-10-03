"""
AgriEdge Core FastAPI Application Entrypoint
"Save Water. Save Energy. Grow Smarter."
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.api.config import settings
from apps.api.database import engine, Base, SessionLocal
from apps.api.models import User, FPO, FarmerProfile, Farm, Crop
from apps.api.auth import hash_password

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create all database tables on configured engine (PostgreSQL / SQLite)
    Base.metadata.create_all(bind=engine)

    # 2. Seed development records if database is fresh
    db = SessionLocal()
    try:
        existing_user = db.query(User).first()
        if not existing_user:
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
                hashed_password=hash_password("agriedge2026"),
                full_name="Ramesh Gowda",
                phone_number="+91 98450 12345",
                role="FARMER",
                language_preference="en"
            )
            db.add(farmer_user)

            # Seed FPO Admin User
            fpo_user = User(
                email="admin.cauveryfpo@agriedge.internal",
                hashed_password=hash_password("agriedge2026"),
                full_name="Dr. H. M. Shivakumar (FPO Agronomist)",
                phone_number="+91 94480 54321",
                role="FPO_ADMIN",
                language_preference="en"
            )
            db.add(fpo_user)

            # Seed System Admin User
            admin_user = User(
                email="admin@agriedge.internal",
                hashed_password=hash_password("agriedge2026"),
                full_name="System Administrator",
                phone_number="+91 90000 00000",
                role="SYSTEM_ADMIN",
                language_preference="en"
            )
            db.add(admin_user)
            db.commit()

            # Seed Farmer Profile & Farm
            profile = FarmerProfile(
                user_id=farmer_user.id,
                fpo_id=fpo.id,
                village="Channapatna",
                block="Channapatna",
                district="Ramanagara",
                state="Karnataka",
                latitude=12.651,
                longitude=77.202
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

            farm = Farm(
                farmer_id=profile.id,
                fpo_id=fpo.id,
                farm_name="Ramesh Green Valley Farm",
                total_area_acres=2.0,
                soil_type="loam",
                irrigation_type="drip",
                pump_hp=5.0,
                pump_type="electric",
                discharge_rate_lps=8.0,
                village="Channapatna",
                district="Ramanagara",
                latitude=12.651,
                longitude=77.202
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
            print("[AgriEdge] Seeded database entities successfully.")
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

# CORS Configuration (Allows configured origins + any *.vercel.app domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
