# AgriEdge Security & Guardrail Architecture

AgriEdge operates on the principle that incorrect agronomic advice or compromised farm data can inflict serious financial damage on smallholder livelihoods.

---

## 1. Authentication & Session Security
- **Bcrypt Hashing:** Passwords hashed with standard 12-round salt derivation.
- **JWT Tokens:** Short-lived access tokens (24 hours) and long-lived refresh tokens (7 days).
- **No Secrets in Client Bundles:** Frontend code never contains API keys, database URLs, or provider credentials.
- **RBAC Enforcement:** Role guards verify `FARMER`, `FPO_ADMIN`, `AGRONOMIST`, and `SYSTEM_ADMIN` scopes on every protected API endpoint.

---

## 2. File Upload & Media Ingestion Security
- **MIME Type Whitelist:** Only `image/jpeg`, `image/png`, and `image/webp` are permitted. Executables, scripts, and unknown binary payloads are blocked at the gateway.
- **File Size Cap:** Maximum payload size capped at 10 MB.
- **Memory Buffer Parsing:** Image decoding uses isolated PIL byte streams; temporary files are not written to shared system directories.

---

## 3. Defense Against AI Prompt Injection
- Retrieved RAG documentation and farmer voice transcripts are classified as **untrusted data**.
- All retrieved agricultural text passes through `sanitize_retrieved_text()` which strips system directive tokens, role-hijacking phrases (`System:`, `Ignore previous instructions`), and control tokens.
- Clear delimiter boundaries strictly separate:
  1. Immutable System Instructions
  2. Verified Agronomic Reference Text
  3. User Field Query

---

## 4. Agronomic Safety & Pesticide Prohibitions
- Models are restricted from prescribing prohibited or banned chemicals (e.g. Endosulfan, Monocrotophos on vegetables).
- High-risk treatments mandate certified extension officer or agronomist on-site verification.
- Confidence thresholds: Diagnoses with confidence $< 80\%$ explicitly display the warning badge: *"Agronomist physical inspection recommended."*
