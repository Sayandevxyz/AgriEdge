"""
AgriEdge API Integration & Security Test Suite
Tests FastAPI endpoints using TestClient covering:
- Public registration forces role="FARMER" and cannot create admin
- Admin / FPO routes return 401 (unauthenticated) and 403 (unauthorized role)
- Login success / failure
- Demo-login disabled in production mode
- Startup seeding creates FPO, users, farmer profile, farm, and tomato crop
- Reverse geocode GET endpoint with query parameters lat and lon
- Full Farms CRUD (Create, Read list, Read single, Update, Delete)
- Advisory generate requires authentication
- Market fallback flags is_realtime=False when live source is absent
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.config import settings
from apps.api.database import SessionLocal
from apps.api.models import User, Farm, Crop, FPO, FarmerProfile
from services.market.market_service import market_agent


@pytest.fixture(scope="module")
def client():
    """Test client wrapping the FastAPI application with lifespan context."""
    with TestClient(app) as c:
        yield c


def test_startup_seeding_creates_farm_and_crop(client):
    """Verify startup lifespan creates FPO, seeded users, farm and active tomato crop."""
    db = SessionLocal()
    try:
        fpo = db.query(FPO).first()
        assert fpo is not None, "FPO was not seeded"

        farmer_user = db.query(User).filter(User.email == "ramesh.farmer@agriedge.internal").first()
        assert farmer_user is not None, "Farmer user was not seeded"
        assert farmer_user.role == "FARMER"

        profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == farmer_user.id).first()
        assert profile is not None, "Farmer profile was not seeded"

        farm = db.query(Farm).filter(Farm.farmer_id == profile.id).first()
        assert farm is not None, "Farm was not seeded"

        crop = db.query(Crop).filter(Crop.farm_id == farm.id).first()
        assert crop is not None, "Crop was not seeded"
        assert crop.crop_name == "Tomato"
    finally:
        db.close()


def test_register_cannot_create_admin(client):
    """Verify public registration always forces role=FARMER, ignoring any role override attempt."""
    import uuid
    unique_email = f"test.farmer_{uuid.uuid4().hex[:8]}@agriedge.io"
    register_payload = {
        "email": unique_email,
        "password": "ValidPassword123",
        "full_name": "Test New Farmer",
        "phone_number": "+91 99999 11111",
        "village": "Hassan",
        "district": "Hassan",
        # Attempt to inject SYSTEM_ADMIN role
        "role": "SYSTEM_ADMIN"
    }

    res = client.post("/api/v1/auth/register", json=register_payload)
    assert res.status_code in [200, 201], f"Registration failed: {res.text}"
    data = res.json()
    assert data["role"] == "FARMER", f"Expected role FARMER, got {data['role']}"
    assert "access_token" in data

    # Attempt to access /admin/system with this newly registered user token
    admin_res = client.get(
        "/api/v1/admin/system",
        headers={"Authorization": f"Bearer {data['access_token']}"}
    )
    assert admin_res.status_code == 403, f"Farmer should receive 403 on admin route, got {admin_res.status_code}"


def test_auth_routes_role_protection(client):
    """Verify /admin/* requires SYSTEM_ADMIN and /fpo/* requires FPO_ADMIN or SYSTEM_ADMIN."""
    # 1. Unauthenticated requests should return 401
    assert client.get("/api/v1/admin/system").status_code == 401
    assert client.get("/api/v1/fpo/dashboard").status_code == 401

    # 2. Login as seeded FARMER
    farmer_login = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agriedge.internal",
        "password": "agriedge2026"
    })
    assert farmer_login.status_code == 200
    farmer_token = farmer_login.json()["access_token"]
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}

    # Farmer accessing /admin/* and /fpo/* should return 403
    assert client.get("/api/v1/admin/system", headers=farmer_headers).status_code == 403
    assert client.get("/api/v1/fpo/dashboard", headers=farmer_headers).status_code == 403

    # 3. Login as seeded FPO_ADMIN
    fpo_login = client.post("/api/v1/auth/login", json={
        "email": "admin.cauveryfpo@agriedge.internal",
        "password": "agriedge2026"
    })
    assert fpo_login.status_code == 200
    fpo_token = fpo_login.json()["access_token"]
    fpo_headers = {"Authorization": f"Bearer {fpo_token}"}

    # FPO admin can access /fpo/dashboard, but not /admin/system
    assert client.get("/api/v1/fpo/dashboard", headers=fpo_headers).status_code == 200
    assert client.get("/api/v1/admin/system", headers=fpo_headers).status_code == 403

    # 4. Login as seeded SYSTEM_ADMIN
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@agriedge.internal",
        "password": "agriedge2026"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # System Admin can access both /admin/system and /fpo/dashboard
    assert client.get("/api/v1/admin/system", headers=admin_headers).status_code == 200
    assert client.get("/api/v1/fpo/dashboard", headers=admin_headers).status_code == 200


def test_login_success_and_failure(client):
    """Verify login succeeds with valid credentials and fails with invalid credentials."""
    # Invalid password
    bad_res = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agriedge.internal",
        "password": "WrongPassword999"
    })
    assert bad_res.status_code == 401

    # Valid password
    good_res = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agriedge.internal",
        "password": "agriedge2026"
    })
    assert good_res.status_code == 200
    data = good_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "FARMER"


def test_demo_login_disabled_in_production(client, monkeypatch):
    """Verify demo-login endpoints return 404 when APP_MODE is production and demo login is disabled."""
    monkeypatch.setattr(settings, "APP_MODE", "production")
    monkeypatch.setattr(settings, "ENABLE_DEMO_LOGIN", False)

    res_farmer = client.post("/api/v1/auth/demo-login/farmer")
    assert res_farmer.status_code == 404

    res_admin = client.post("/api/v1/auth/demo-login/system_admin")
    assert res_admin.status_code == 404


def test_reverse_geocode_get(client):
    """Verify /location/reverse-geocode accepts GET with lat and lon query parameters."""
    res = client.get("/api/v1/location/reverse-geocode?lat=13.0827&lon=80.2707")
    assert res.status_code == 200
    data = res.json()
    assert "formatted_location" in data or "district" in data
    assert data.get("latitude") is not None


def test_farms_crud(client):
    """Verify complete CRUD lifecycle on /farms endpoints."""
    # Login as seeded farmer
    login_res = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agriedge.internal",
        "password": "agriedge2026"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. CREATE Farm
    new_farm_payload = {
        "farm_name": "Mysore Test Organic Farm",
        "crop_name": "Chilli",
        "variety": "Byadgi",
        "planting_date": "2026-08-10",
        "total_area_acres": 3.5,
        "soil_type": "clay_loam",
        "irrigation_type": "drip",
        "pump_hp": 7.5,
        "pump_type": "electric",
        "discharge_rate_lps": 10.0,
        "village": "Nanjangud",
        "district": "Mysore",
        "state": "Karnataka",
        "latitude": 12.12,
        "longitude": 76.68
    }
    create_res = client.post("/api/v1/farms", json=new_farm_payload, headers=headers)
    assert create_res.status_code == 201
    created_farm = create_res.json()
    farm_id = created_farm["farm_id"]
    assert farm_id is not None

    # 2. READ Farm list
    list_res = client.get("/api/v1/farms", headers=headers)
    assert list_res.status_code == 200
    farms_list = list_res.json()
    assert any(f["id"] == farm_id for f in farms_list)

    # 3. READ single Farm
    get_res = client.get(f"/api/v1/farms/{farm_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["farm_name"] == "Mysore Test Organic Farm"

    # 4. UPDATE Farm
    update_res = client.put(
        f"/api/v1/farms/{farm_id}",
        json={"farm_name": "Mysore Premium Organic Farm", "total_area_acres": 4.0},
        headers=headers
    )
    assert update_res.status_code == 200

    verify_res = client.get(f"/api/v1/farms/{farm_id}", headers=headers)
    assert verify_res.json()["farm_name"] == "Mysore Premium Organic Farm"
    assert verify_res.json()["total_area_acres"] == 4.0

    # 5. DELETE Farm
    del_res = client.delete(f"/api/v1/farms/{farm_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify deleted
    not_found_res = client.get(f"/api/v1/farms/{farm_id}", headers=headers)
    assert not_found_res.status_code == 404


def test_advisory_generate_requires_auth(client):
    """Verify /advisory/generate rejects unauthenticated requests with 401."""
    advisory_payload = {
        "crop": "Tomato",
        "planting_date": "2026-08-20",
        "farm_acres": 2.0,
        "soil_type": "loam",
        "irrigation_method": "drip",
        "pump_hp": 5.0,
        "latitude": 13.08,
        "longitude": 80.27
    }

    # Without token
    no_auth_res = client.post("/api/v1/advisory/generate", json=advisory_payload)
    assert no_auth_res.status_code == 401

    # With valid farmer token
    login_res = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agriedge.internal",
        "password": "agriedge2026"
    })
    token = login_res.json()["access_token"]
    auth_res = client.post(
        "/api/v1/advisory/generate",
        json=advisory_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert auth_res.status_code == 200
    data = auth_res.json()
    assert "advisory_id" in data
    assert "water" in data


@pytest.mark.asyncio
async def test_market_fallback_flags_is_realtime_false(monkeypatch):
    """Verify market service returns is_realtime=False and data_source contains 'Estimated' without API key."""
    monkeypatch.setattr(market_agent, "api_key", "")
    data = await market_agent.get_market_data(crop="Tomato", district="Mandya", state="Karnataka")
    assert data["is_realtime"] is False
    assert data["is_live_available"] is False
    assert "Estimated benchmark (not live)" in data["data_source"]
