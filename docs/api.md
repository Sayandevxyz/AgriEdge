# AgriEdge REST API Specification

Base URL: `http://localhost:8000/api/v1`  
Interactive OpenAPI Explorer: `http://localhost:8000/docs`  
ReDoc Documentation: `http://localhost:8000/redoc`

---

## 1. Authentication (`/auth`)

### `GET /auth/config`
Public runtime configuration endpoint used by client frontends.
- **Response (200 OK):**
  ```json
  {
    "demo_enabled": true,
    "app_mode": "development"
  }
  ```
- In `production` mode, `demo_enabled` evaluates to `false`, causing the login page to hide 1-click demo login buttons.

### `POST /auth/register`
Public user registration. **Always forces role `FARMER`** regardless of payload parameters.
- **Password Policy:** Must be at least 8 characters and include at least one letter and one number. Rejects weak passwords with `422 Unprocessable Entity`.
- **Rate Limit:** 10 requests per 60 seconds.
- **Request:**
  ```json
  {
    "email": "farmer@example.com",
    "password": "Password123!",
    "full_name": "Ramesh Gowda",
    "phone_number": "+91 98450 12345",
    "village": "Hassan",
    "district": "Hassan",
    "state": "Karnataka",
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
Authenticates credentials and returns a fresh access token and refresh token.
- **Rate Limit:** 15 requests per 60 seconds (16th returns `429 Too Many Requests`).
- **Response (200 OK):** Returns `TokenResponse` with `access_token` and `refresh_token`.

### `POST /auth/refresh`
Rotates access and refresh tokens.
- **Request:**
  ```json
  {
    "refresh_token": "eyJhbGciOi..."
  }
  ```
- **Validation:**
  - Token signature is verified against `JWT_REFRESH_SECRET`.
  - Token claims must satisfy `"type": "refresh"`. An access token sent as a refresh token is rejected with `401 Unauthorized` (`INVALID_TOKEN_TYPE`).
  - Expired or invalid tokens return `401 Unauthorized`.
- **Response (200 OK):** Fresh `access_token` and `refresh_token`.

### `POST /auth/admin/users`
Protected endpoint accessible **only to `SYSTEM_ADMIN`** (`require_roles("SYSTEM_ADMIN")`).
Allows provisioning users with arbitrary roles (`FARMER`, `FPO_ADMIN`, `AGRONOMIST`, `SYSTEM_ADMIN`).
- **Authorization:** `Bearer <admin_jwt_token>`
- Returns `403 Forbidden` for `FARMER` or `FPO_ADMIN`, and `401 Unauthorized` without a token.
- **Request:**
  ```json
  {
    "email": "agronomist@cauveryfpo.internal",
    "password": "SecurePassword2026",
    "full_name": "Dr. Ananya Sharma",
    "role": "FPO_ADMIN"
  }
  ```

### `POST /auth/demo-login/{role}`
Quick 1-click Judge Mode demo login:
- Allowed roles: `farmer`, `fpo_admin`, `system_admin`.
- **Security Guard:** Returns `404 Not Found` when `APP_MODE == "production"` unless `ENABLE_DEMO_LOGIN == True`.

---

## 2. Farmer & Farms (`/farmer`, `/farms`)

All farm endpoints enforce **strict farmer ownership**. A farmer cannot access or modify farms belonging to another user.

### `GET /farmer/profile`
Retrieves authenticated farmer's profile, village, and farm counts.

### `GET /farms`
Returns all farms owned by the authenticated farmer.

### `GET /farms/{farm_id}`
Returns details of the specified farm. Returns `404 Not Found` if the farm does not belong to the caller.

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
    "village": "Hassan",
    "district": "Hassan",
    "state": "Karnataka",
    "latitude": 13.08,
    "longitude": 76.10
  }
  ```

### `PUT /farms/{farm_id}`
Updates farm attributes. Returns `404 Not Found` if the farm is not owned by the caller.

### `DELETE /farms/{farm_id}`
Deletes farm and its associated crops. Returns `404 Not Found` if the farm is not owned by the caller.

### `GET /farmer/history`
Returns past advisory recommendations linked to crops on the authenticated farmer's farms.

---

## 3. Vision & Leaf Diagnostics (`/vision`)

### `POST /vision/detect-crop`
Automated AI leaf species detection and morphology extractor.
- Accepts `multipart/form-data` with `file`.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp` (returns `400 Bad Request` otherwise).
- Max file size: **10 MB** (returns `413 Request Entity Too Large` otherwise).

### `POST /vision/analyze`
Full foliar disease analysis and multi-agent advisory orchestration from an uploaded leaf photo.
- Validates image dimensions, blur sharpness (Laplacian variance $\ge 30$), and crop presence.

---

## 4. Advisory & Irrigation (`/advisory`, `/irrigation`)

### `POST /advisory/generate`
Multi-agent crop intelligence pipeline combining FAO-56 Penman-Monteith ET0, crop coefficient $K_c$, USDA effective rainfall, pump energy calculations, and ICAR/TNAU RAG agronomic advice.
- Requires authentication (`Bearer <jwt_token>`).

### `GET /advisories/{advisory_uuid}`
Retrieves an existing advisory by UUID. Enforces farmer ownership isolation (returns `403 Forbidden` if another farmer attempts access).

### `POST /irrigation/recommend`
Fast-path endpoint for instant irrigation runtime triage without uploading foliar imagery.

---

## 5. Feedback & Outcomes (`/feedback`, `/outcomes`)

### `POST /feedback`
Logs farmer action taken, water actually applied, and crop response.
- **Ownership Guard:** Validates that the referenced `advisory_id` belongs to the authenticated farmer's crop (returns `403 Forbidden` if another farmer attempts submission).
- Triggers the `OutcomeAgent` efficacy scoring pipeline for continuous learning.

### `GET /feedback/{feedback_uuid}`
Retrieves feedback details. Enforces ownership isolation (`403 Forbidden` for unauthorized callers).

---

## 6. Location & Geocoding (`/location`)

### `GET /location/reverse-geocode?lat=13.08&lon=80.27`
Performs reverse geocoding from GPS coordinates with offline regional fallback.
- Supports both GET query parameters (`lat`, `lon`) and POST body payloads.

---

## 7. FPO Regional Intelligence (`/fpo`)

Protected by `require_roles("FPO_ADMIN", "SYSTEM_ADMIN")`.
- `GET /fpo/dashboard`: Aggregated smallholder metrics, water savings, energy trends, and crop distribution.
- `GET /fpo/disease-map`: Village and block level disease hotspot centroid clusters. Strictly masks individual farm GPS locations.

---

## 8. System Administration (`/admin`)

Protected by `require_roles("SYSTEM_ADMIN")`.
- `GET /admin/system`: System observability metrics, active agents, token counts, and cost telemetry.
