# AgriEdge REST API Specification

Base URL: `http://localhost:8000/api/v1`  
Interactive OpenAPI Explorer: `http://localhost:8000/docs`  
ReDoc Documentation: `http://localhost:8000/redoc`

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
Creates a new user profile (FARMER, FPO_ADMIN, AGRONOMIST, SYSTEM_ADMIN).
- **Request:**
  ```json
  {
    "email": "farmer@example.com",
    "password": "Password123!",
    "full_name": "Ramesh Gowda",
    "phone_number": "+91 98450 12345",
    "role": "FARMER",
    "language_preference": "en"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": 1,
    "full_name": "Ramesh Gowda",
    "role": "FARMER",
    "language_preference": "en"
  }
  ```

### `POST /auth/login`
Authenticates user credentials and returns JWT bearer token.

### `POST /auth/demo-login/{role}`
Quick 1-click Judge Mode demo login:
- `role`: `FARMER`, `FPO_ADMIN`, or `SYSTEM_ADMIN`.

---

## 2. Farmer & Farms (`/farmer`, `/farms`)

### `GET /farmer/profile`
Retrieves authenticated farmer's profile, village, and farm counts.

### `GET /farms`
Returns all farms owned by the authenticated farmer.

### `POST /farms`
Registers a new farm boundary, soil type, crop sowing date, and pump capacity.
- **Request:**
  ```json
  {
    "farm_name": "Cauvery Valley Farm",
    "total_area_acres": 2.0,
    "crop_name": "Tomato",
    "variety": "Arka Rakshak",
    "planting_date": "2026-08-20",
    "soil_type": "loam",
    "irrigation_type": "drip",
    "pump_hp": 5.0,
    "pump_type": "electric",
    "discharge_rate_lps": 8.0,
    "village": "Channapatna",
    "district": "Ramanagara"
  }
  ```

---

## 3. Vision & Leaf Diagnostics (`/vision`)

### `POST /vision/analyze`
Multipart file upload of crop leaf photograph.
- Validates image dimensions ($\ge 200\times 200$), brightness, and Laplacian blur score ($\ge 30.0$).
- Performs optical color channel analysis.
- Invokes `AdvisoryOrchestrator` to produce unified diagnosis, water advice, and energy calculation.

---

## 4. Advisory & Irrigation (`/advisory`, `/irrigation`)

### `POST /advisory/generate`
Synthesizes multi-agent intelligence into structured recommendations.
- **Request:**
  ```json
  {
    "crop": "Tomato",
    "planting_date": "2026-08-20",
    "farm_acres": 2.0,
    "soil_type": "loam",
    "irrigation_method": "drip",
    "pump_hp": 5.0,
    "pump_type": "electric",
    "latitude": 12.65,
    "longitude": 77.20
  }
  ```
- **Response:** Complete JSON object containing `water`, `energy`, `crop_health`, `weather_context`, `what_to_do`, `what_not_to_do`, and `citations`.

### `POST /irrigation/recommend`
Fast-path endpoint for pure crop water triage and runtime calculation without foliar photo.

---

## 5. Voice & NLU (`/voice`)

### `POST /voice/transcribe`
Processes query text or audio blob, detects intent (`IRRIGATION_QUERY`, `DISEASE_QUERY`, `WEATHER_QUERY`), extracts entities, and synthesizes spoken text.

---

## 6. Weather & Rainfall Hazard (`/weather`)

### `GET /weather/current?lat=12.65&lon=77.20`
Returns temperature, humidity, wind, and precipitation.

### `GET /weather/forecast?lat=12.65&lon=77.20`
Returns 5-day daily precipitation, rain hazard risk, and optimal irrigation windows.

---

## 7. Scenario Simulation (`/scenario`)

### `POST /scenario/simulate`
Simulates "Wait 2 days", "Reduce irrigation by 20%", or "Heavy rain occurs".

---

## 8. Feedback & Outcome Loop (`/feedback`, `/outcomes`)

### `POST /feedback`
Logs farmer action taken, water actually applied, and crop response. Triggers `OutcomeAgent` efficacy scoring.

---

## 9. FPO Regional Intelligence (`/fpo`)

### `GET /fpo/dashboard`
Aggregated smallholder metrics, water savings, energy trends, and crop distribution.

### `GET /fpo/disease-map`
Village and block level disease hotspot centroid clusters. Strictly masks individual farm locations.

---

## 10. Admin & Health (`/admin`, `/health`)

### `GET /admin/system`
Observability metrics, active agents, token counts, and cost per advisory.

### `GET /health`
System health probe: database, cache, vision, weather, ET, and RAG states.
