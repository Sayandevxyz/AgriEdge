# AgriEdge Model Card & Verification Standards

## Model Details
- **Model Name:** AgriEdge Unified Agro-Triage Engine v1.0
- **Primary Modalities:** Computer Vision (RGB Leaf Lesions) + Penman-Monteith Thermodynamic Modeling + NLP (Multilingual intent recognition)
- **Mathematical Standard:** FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998)
- **Effective Precipitation Formulation:** USDA Soil Conservation Service (SCS) method
- **Digital Consent Standard:** Digital Personal Data Protection (DPDP) compliant consent gating

---

## 📋 System Truth & Capability Matrix: What is Real, Simulated, and Not Built

| Module / Capability | Status | True Implementation Details |
| :--- | :--- | :--- |
| **FAO-56 Penman-Monteith Evapotranspiration** | **REAL** | Deterministic mathematical implementation of FAO-56 Eq 6 reference evapotranspiration ($ET_0$), growth-stage crop coefficient ($K_c$), and crop evapotranspiration ($ET_c$). |
| **Pump Energy & Tariff Model** | **REAL** | Mathematical model calculating pump electrical consumption ($\text{kW} = \text{HP} \times 0.7457$), pumping duration from discharge rate, electrical energy (kWh), electric grid tariff cost, and diesel fuel fallback calculations. |
| **USDA SCS Effective Precipitation** | **REAL** | Deterministic deduction of effective rainfall ($P_e$) from gross irrigation requirements. |
| **Leaf Quality Assessment (Blur & Luminance)** | **REAL** | Computer vision preprocessing computing Laplacian edge variance blur detection, luminance thresholding, and image dimension validation. |
| **Vision Crop Classification** | **REAL / HEURISTIC FALLBACK** | Optical analysis using multimodal AI when `GEMINI_API_KEY` is configured. When unconfigured, employs optical color and aspect-ratio heuristics capped strictly at 0.60 confidence with `requires_agronomist_verification=true` and UI badging. No filename cheats in the production path. |
| **FPO Dashboard & Aggregation** | **REAL / DEMO GATED** | Computes KPIs directly from database tables (`FarmerProfile`, `Farm`, `Crop`, `Advisory`, `Feedback`). Zero state returns zeroes with an empty-state message. Seeded demo data is gated behind `DEMO_DATA=true` or `?demo=true` with a clear "Demo data" UI badge. Disease hotspots aggregate strictly to district centroids from actual `Advisory.disease_detected`. |
| **Weather Forecast & Observations** | **REAL / ESTIMATED FALLBACK** | OpenWeatherMap API integration with TTL caching when API key is configured. Transparently falls back to an agro-meteorological estimation model when unconfigured. |
| **APMC Market Pricing** | **REAL / ESTIMATED FALLBACK** | Agmarknet integration when API key is provided. Transparently falls back to regional benchmark price estimates when unconfigured. |
| **Dual-Tier Caching Service** | **REAL** | Dual-tier cache powered by `redis-py` with seamless in-memory TTL dictionary fallback. `/health` inspects and reports the active backend (`redis` vs `memory_fallback`). |
| **Scenario Simulator** | **SIMULATED** | Evaluates what-if agricultural situations using existing FAO-56 and energy models: heatwave stress ($ET_0 +20\%$), 7-day drought ($0\text{ mm}$ rain), power outage (diesel pump fallback), and solar pump conversion (zero electric tariff). |
| **DPDP Digital Consent Gate** | **REAL** | Digital Personal Data Protection compliance: consent capture during registration, timestamped consent version stored on the `User` model, dedicated `/privacy` policy page, and 403 Forbidden enforcement blocking image diagnostics until consent is registered. |
| **Feedback Curation for Retraining** | **REAL** | Length heuristics removed. All feedback records default to `curated_for_retraining=False`. Only set to `True` when approved by an authenticated `AGRONOMIST` or `FPO_ADMIN` via `PATCH /feedback/{id}/curate`. |
| **Supported Languages** | **REAL (en, hi, ta)** | Fully localized UI strings and voice intent parsing for English (`en`), Hindi (`hi`), and Tamil (`ta`). Other languages (`te`, `mr`, `bn`, `kn`) are not built and have been excluded. |
| **WhatsApp / IVR Telephony** | **NOT BUILT** | No telephony, SMS gateway, or WhatsApp Business API integrations are connected. Removed from claims. |
| **NDVI / Satellite Telemetry** | **NOT BUILT** | Foliar diagnostics rely purely on ground-level leaf photographs. No satellite or remote sensing telemetry is implemented. |
| **AWS S3 Cloud Storage** | **NOT BUILT** | Image processing occurs in-memory via Pillow BytesIO and local storage; no AWS S3 buckets are utilized. |
| **MLflow Experiment Tracking** | **NOT BUILT** | Evaluation records are persisted in local SQL database tables; no external MLflow tracking server is configured. |

---

## Intended Use
- **Primary Users:** Smallholder farmers, Farmer Producer Organizations (FPOs), rural agricultural extension workers.
- **Intended Purpose:** To guide irrigation scheduling (irrigate now vs skip/reduce based on rain forecasts) and identify common foliar fungal/bacterial leaf lesions without requiring physical in-situ sensors.

---

## Limitations, Honesty & Disclaimers
1. **No Physical Sensor Claims:** Soil water status is labeled as *"Estimated soil water status"*, never *"Measured soil moisture"*.
2. **Potential vs Realized Savings:** Water and power savings are labeled as *"Potential savings"* or *"Estimated savings"*, dependent on actual farmer adherence.
3. **No Unsupervised Retraining:** Models are never automatically retrained on unverified farmer feedback or length heuristics. Records must be explicitly verified and approved by an Agronomist or FPO Admin.
4. **Heuristic Confidence Cap:** When vision API keys are not supplied, crop classification runs in heuristic mode with confidence strictly capped at $\le 0.60$ and flagged for agronomist verification.
5. **Transparency in Market and Weather:** When external API keys are not provided, interfaces clearly state that data is an estimated local benchmark rather than live external feeds.
