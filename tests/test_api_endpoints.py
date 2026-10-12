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

import uuid
import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.config import settings, Settings
from apps.api.database import SessionLocal
from apps.api.models import User, Farm, Crop, FPO, FarmerProfile
from apps.api.rate_limiter import limiter
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


def test_rate_limit_and_oversized_upload(client):
    """
    Verify:
    1. Rapid POSTs to /auth/login return 429 after exceeding limit (15 requests/min).
    2. Uploading a file larger than 10MB to vision endpoint returns 413 or 400.
    """
    limiter.reset()
    try:
        # Rapidly attempt login from the same client IP
        # 15 allowed in sliding window; 16th returns 429
        responses = []
        for i in range(16):
            res = client.post("/api/v1/auth/login", json={
                "email": "ramesh.farmer@agriedge.internal",
                "password": "wrongpassword"
            })
            responses.append(res.status_code)

        assert 429 in responses, f"Expected 429 in rapid login attempts, got: {responses}"
        assert responses[-1] == 429
    finally:
        limiter.reset()

    # Oversized upload test (> 10MB)
    large_payload = b"0" * (10 * 1024 * 1024 + 1024)  # 10MB + 1KB
    upload_res = client.post(
        "/api/v1/vision/detect-crop",
        files={"file": ("large_leaf.jpg", large_payload, "image/jpeg")}
    )
    assert upload_res.status_code in [413, 400], f"Expected 413 or 400 for >10MB upload, got {upload_res.status_code}"


def test_password_policy_rejected_at_register(client):
    """Verify passwords 'short1', 'onlyletters' and '12345678' are rejected at register with 422."""
    weak_passwords = ["short1", "onlyletters", "12345678"]
    for wp in weak_passwords:
        res = client.post("/api/v1/auth/register", json={
            "email": f"weak_{wp}_{uuid.uuid4().hex[:6]}@agriedge.io",
            "password": wp,
            "full_name": f"Weak Tester {wp}"
        })
        assert res.status_code == 422, f"Expected 422 for weak password '{wp}', got {res.status_code}: {res.text}"


def test_auth_refresh_token_lifecycle(client):
    """
    Verify:
    1. Valid refresh token returns a new access token (200).
    2. An ACCESS token sent as a refresh token is rejected (401).
    3. An expired or garbage token returns 401.
    """
    # 1. Login to get both access and refresh tokens
    login_res = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agriedge.internal",
        "password": "agriedge2026"
    })
    assert login_res.status_code == 200
    tokens = login_res.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # Valid refresh token exchange
    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    ref_data = ref_res.json()
    assert "access_token" in ref_data
    assert "refresh_token" in ref_data

    # ACCESS token passed to refresh endpoint must be rejected with 401
    acc_as_ref = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert acc_as_ref.status_code == 401, f"Expected 401 when access token sent as refresh, got {acc_as_ref.status_code}"

    # Expired / garbage token returns 401
    bad_token = client.post("/api/v1/auth/refresh", json={"refresh_token": "not.a.valid.jwt.token"})
    assert bad_token.status_code == 401


def test_admin_create_users_role_enforcement(client):
    """
    Verify POST /auth/admin/users:
    - Works for SYSTEM_ADMIN (200/201)
    - Returns 403 for FARMER and FPO_ADMIN
    - Returns 401 without token
    """
    admin_payload = {
        "email": f"agronomist_{uuid.uuid4().hex[:6]}@cauveryfpo.internal",
        "password": "StrongPassword2026",
        "full_name": "Senior Agronomist",
        "role": "AGRONOMIST"
    }

    # 1. Without token -> 401
    unauth_res = client.post("/api/v1/auth/admin/users", json=admin_payload)
    assert unauth_res.status_code == 401

    # 2. As FARMER -> 403
    farmer_login = client.post("/api/v1/auth/login", json={
        "email": "ramesh.farmer@agriedge.internal",
        "password": "agriedge2026"
    })
    farmer_headers = {"Authorization": f"Bearer {farmer_login.json()['access_token']}"}
    farmer_res = client.post("/api/v1/auth/admin/users", json=admin_payload, headers=farmer_headers)
    assert farmer_res.status_code == 403

    # 3. As FPO_ADMIN -> 403
    fpo_login = client.post("/api/v1/auth/login", json={
        "email": "admin.cauveryfpo@agriedge.internal",
        "password": "agriedge2026"
    })
    fpo_headers = {"Authorization": f"Bearer {fpo_login.json()['access_token']}"}
    fpo_res = client.post("/api/v1/auth/admin/users", json=admin_payload, headers=fpo_headers)
    assert fpo_res.status_code == 403

    # 4. As SYSTEM_ADMIN -> 200/201
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@agriedge.internal",
        "password": "agriedge2026"
    })
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    admin_res = client.post("/api/v1/auth/admin/users", json=admin_payload, headers=admin_headers)
    assert admin_res.status_code in [200, 201]
    assert admin_res.json()["role"] == "AGRONOMIST"


def test_production_safety_settings_raises():
    """Verify that with APP_MODE=production and a missing or example JWT_SECRET, Settings() raises."""
    # Missing JWT_SECRET in production mode raises ValueError
    with pytest.raises(ValueError):
        Settings(APP_MODE="production", JWT_SECRET="", JWT_REFRESH_SECRET="production_refresh_sec_key_1234567")

    # Example JWT_SECRET in production mode raises ValueError
    for example_sec in [
        "agriedge_jwt_super_secret_key_change_in_production_987654321",
        "your_jwt_secret",
        "secret",
        "changeme"
    ]:
        with pytest.raises(ValueError):
            Settings(APP_MODE="production", JWT_SECRET=example_sec, JWT_REFRESH_SECRET="production_refresh_sec_key_1234567")

    # Missing JWT_REFRESH_SECRET in production mode raises ValueError
    with pytest.raises(ValueError):
        Settings(APP_MODE="production", JWT_SECRET="valid_production_secret_key_1234567", JWT_REFRESH_SECRET="")


def test_ownership_isolation(client):
    """
    Verify strict ownership isolation:
    User B cannot read or modify User A's farm, advisory or feedback (expect 403/404).
    """
    # 1. Register User A and create a farm
    u_a_email = f"user_a_{uuid.uuid4().hex[:6]}@agriedge.io"
    res_a = client.post("/api/v1/auth/register", json={
        "email": u_a_email,
        "password": "Password123UserA",
        "full_name": "Farmer User A"
    })
    assert res_a.status_code in [200, 201]
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    farm_a_res = client.post("/api/v1/farms", json={
        "farm_name": "User A Private Farm",
        "crop_name": "Tomato",
        "variety": "Arka Rakshak",
        "planting_date": "2026-08-20",
        "total_area_acres": 2.5,
        "soil_type": "clay_loam",
        "irrigation_type": "drip",
        "pump_hp": 5.0,
        "pump_type": "electric",
        "discharge_rate_lps": 8.0,
        "village": "Hassan",
        "district": "Hassan",
        "state": "Karnataka",
        "latitude": 13.0,
        "longitude": 76.1
    }, headers=headers_a)
    assert farm_a_res.status_code == 201
    farm_a_id = farm_a_res.json()["farm_id"]

    # Generate an advisory for User A
    adv_a_res = client.post("/api/v1/advisory/generate", json={
        "crop": "Tomato",
        "planting_date": "2026-08-20",
        "farm_acres": 2.5,
        "soil_type": "clay_loam",
        "irrigation_method": "drip",
        "pump_hp": 5.0,
        "latitude": 13.0,
        "longitude": 76.1
    }, headers=headers_a)
    assert adv_a_res.status_code == 200
    advisory_a_uuid = adv_a_res.json()["advisory_id"]

    # Submit feedback for User A's advisory by User A
    fb_a_res = client.post("/api/v1/feedback", json={
        "advisory_id": advisory_a_uuid,
        "predicted_action": "APPLY IRRIGATION",
        "action_taken": "Irrigated 1.5 hours",
        "water_used_litres": 3200,
        "crop_condition": "Improved",
        "farmer_comment": "User A feedback comment"
    }, headers=headers_a)
    assert fb_a_res.status_code == 200
    feedback_a_uuid = fb_a_res.json()["feedback_id"]

    # 2. Register User B
    u_b_email = f"user_b_{uuid.uuid4().hex[:6]}@agriedge.io"
    res_b = client.post("/api/v1/auth/register", json={
        "email": u_b_email,
        "password": "Password123UserB",
        "full_name": "Farmer User B"
    })
    assert res_b.status_code in [200, 201]
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B cannot READ User A's farm -> 404
    assert client.get(f"/api/v1/farms/{farm_a_id}", headers=headers_b).status_code == 404

    # User B cannot UPDATE User A's farm -> 404
    assert client.put(f"/api/v1/farms/{farm_a_id}", json={"farm_name": "Hijacked Farm"}, headers=headers_b).status_code == 404

    # User B cannot DELETE User A's farm -> 404
    assert client.delete(f"/api/v1/farms/{farm_a_id}", headers=headers_b).status_code == 404

    # User B cannot READ User A's advisory -> 403 or 404
    adv_b_read = client.get(f"/api/v1/advisories/{advisory_a_uuid}", headers=headers_b)
    assert adv_b_read.status_code in [403, 404]

    # User B cannot MODIFY / submit feedback for User A's advisory -> 403
    fb_b_submit = client.post("/api/v1/feedback", json={
        "advisory_id": advisory_a_uuid,
        "predicted_action": "APPLY IRRIGATION",
        "action_taken": "Malicious feedback attempt by User B",
        "crop_condition": "Deteriorated"
    }, headers=headers_b)
    assert fb_b_submit.status_code in [403, 404]

    # User B cannot READ User A's feedback -> 403 or 404
    fb_b_read = client.get(f"/api/v1/feedback/{feedback_a_uuid}", headers=headers_b)
    assert fb_b_read.status_code in [403, 404]

