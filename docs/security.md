# AgriEdge Security & Guardrail Architecture

AgriEdge operates on the principle that incorrect agronomic advice, unauthorized access, or compromised farm data can inflict serious financial damage on smallholder livelihoods.

---

## 1. Authentication & Role-Based Access Control (RBAC)

### Role Hierarchy
AgriEdge enforces strict, principle-of-least-privilege RBAC across all API routes:
- **`FARMER`**: Publicly registered tier. Scoped strictly to the farmer's own farms, crops, advisory requests, and feedback logs. Cannot access admin observability or FPO cluster analytics.
- **`FPO_ADMIN`**: Authorized leadership tier. Accesses aggregated FPO regional dashboards, water and energy adoption metrics, and privacy-preserved disease hotspot clusters. Forbidden from system administrative configuration.
- **`SYSTEM_ADMIN`**: Operational oversight tier. Accesses global system logs, latency metrics, agent telemetry, and user provisioning (`POST /api/v1/auth/admin/users`).

### Public Registration Role Restriction
- The public registration endpoint (`POST /api/v1/auth/register`) **strictly forces `role = "FARMER"`**.
- Any client attempt to inject elevated roles (`SYSTEM_ADMIN`, `FPO_ADMIN`) in the registration payload is ignored.
- Only authenticated `SYSTEM_ADMIN` users can create non-farmer accounts via `POST /api/v1/auth/admin/users`.

### Strict Ownership Isolation
- Farmers cannot access or modify resources belonging to other farmers.
- Farm CRUD (`GET/PUT/DELETE /api/v1/farms/{farm_id}`) validates that `farm.farmer_id == profile.id`; unauthorized access returns `404 Not Found`.
- Advisory access (`GET /api/v1/advisories/{advisory_uuid}`) and feedback submissions (`POST /api/v1/feedback`) enforce that the associated farm/crop belongs to the authenticated user; unauthorized attempts return `403 Forbidden`.

### Password Policy
- Registration requires a minimum of 8 characters.
- Must contain at least one letter (`[A-Za-z]`) and at least one digit (`[0-9]`).
- Weak passwords such as `"short1"`, `"onlyletters"`, and `"12345678"` are rejected with HTTP 422 Unprocessable Entity.

### Token Lifecycle & Refresh Rotation
- **Access Tokens**: Short-lived JWTs (24 hours default) signed with `JWT_SECRET`.
- **Refresh Tokens**: Long-lived JWTs (7 days default) signed with `JWT_REFRESH_SECRET` and tagged with `"type": "refresh"`.
- **`POST /api/v1/auth/refresh`**:
  - Validates cryptographic signature and ensures `"type" == "refresh"`.
  - Passing an access token to the refresh endpoint is explicitly rejected with `401 Unauthorized` (`INVALID_TOKEN_TYPE`).
  - Expired, tampered, or garbage tokens return `401 Unauthorized`.

---

## 2. Rate Limiting & Proxy Trust Architecture

### Client IP Resolution (`TRUSTED_PROXY_COUNT`)
To prevent IP spoofing in environments behind reverse proxies or load balancers (e.g. Render, Cloudflare, Vercel, Nginx):
- The rate limiter inspects the `X-Forwarded-For` header.
- It parses the first untrusted hop from the right based on `settings.TRUSTED_PROXY_COUNT` (default `1`).
- If no proxy headers exist, it falls back safely to `request.client.host`.

### Per-Process Sliding Window & Redis Upgrade Path
- Operates per-process using a thread-safe in-memory sliding window algorithm.
- Sensitive endpoints are protected:
  - `/auth/login`: 15 requests per 60 seconds (returns `429 Too Many Requests`).
  - `/auth/register`: 10 requests per 60 seconds.
  - `/vision/detect-crop`: 20 requests per 60 seconds.
- **Production Scalability**: In multi-process or multi-container deployments, each process maintains its own sliding window. The designated cluster upgrade path is Redis-backed rate limiting configured via `settings.REDIS_URL`.

---

## 3. Production Safety Guards

### Strict Startup Validation
- When `APP_MODE=production`:
  - `JWT_SECRET` and `JWT_REFRESH_SECRET` **must be explicitly provided**.
  - Using missing, empty, or example values (e.g. `"your_jwt_secret"`, `"secret"`, `"changeme"`, or repo examples) causes `Settings()` to raise a fatal `ValueError`, refusing to boot.
- When `APP_MODE=development`:
  - Ephemeral cryptographically secure secrets (`secrets.token_urlsafe(32)`) are automatically generated if unset.

### Demo Mode & Database Seeding Guardrails
- **Demo Logins**: `POST /api/v1/auth/demo-login/{role}` is only active when `APP_MODE == "development"` or `ENABLE_DEMO_LOGIN == True`. In production mode, all demo login endpoints return `404 Not Found`.
- **Database Seeding**: Development demo entities (FPO, Ramesh Gowda, farms, crops) are seeded **only** when `APP_MODE == "development"`. In production, nothing is seeded.
- **Seed Passwords**: Development seed passwords are read from the `SEED_PASSWORD` environment variable, avoiding hardcoded credentials.

---

## 4. File Upload & Media Ingestion Security

- **MIME Type Whitelist**: Only `image/jpeg`, `image/png`, and `image/webp` are permitted.
- **Payload Size Enforcement**: Maximum file size is strictly capped at **10 MB** (`MAX_UPLOAD_SIZE_BYTES`). Files exceeding 10 MB immediately return `413 Request Entity Too Large`.
- **Memory Buffer Parsing**: Image decoding runs in isolated memory streams via PIL/Pillow without writing temporary files to shared system disks.
- **Adversarial / Non-Crop Detection**: Uploaded images are validated for agricultural relevance; non-plant images are rejected with `422 Unprocessable Entity` before running deep analysis.

---

## 5. Defense Against AI Prompt Injection

- Retrieved RAG agronomy documentation and farmer voice transcripts are classified as **untrusted data**.
- All retrieved agricultural text passes through `sanitize_retrieved_text()` which strips system directive tokens, role-hijacking phrases (`System:`, `Ignore previous instructions`), and control tokens.
- Clear delimiter boundaries strictly separate:
  1. Immutable System Instructions
  2. Verified Agronomic Reference Text
  3. User Field Query

---

## 6. Agronomic Safety & Pesticide Prohibitions

- Models are strictly restricted from prescribing prohibited or banned chemicals (e.g. Endosulfan, Monocrotophos on vegetables).
- High-risk treatments mandate certified extension officer or agronomist on-site verification.
- Confidence thresholds: Diagnoses with confidence $< 80\%$ explicitly display the warning badge: *"Agronomist physical inspection recommended."*
