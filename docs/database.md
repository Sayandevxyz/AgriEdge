# AgriEdge Database Architecture & Schema

AgriEdge uses SQLAlchemy 2.0 with native support for **PostgreSQL** in production and **SQLite** for zero-configuration local development.

---

## Entity Relationship Overview

```
User (1) ────────── (1) FarmerProfile (1) ────────── (N) Farm
                                                           │
                                                          (N)
                                                           │
                                                          Crop
                                                           │
                                                          (N)
                                                           │
                                                        Advisory
                                                           │
                                                          (N)
                                                           │
                                                        Feedback
```

---

## Table Definitions

### 1. `users`
- `id` (PK, Integer)
- `email` (String 120, Unique, Indexed)
- `hashed_password` (String 255)
- `full_name` (String 120)
- `phone_number` (String 30)
- `role` (String 30): `FARMER`, `FPO_ADMIN`, `AGRONOMIST`, `SYSTEM_ADMIN`
- `language_preference` (String 10): `en`, `hi`, `ta`
- `is_active` (Boolean)
- `created_at` (DateTime)

### 2. `fpos`
- `id` (PK, Integer)
- `name` (String 150)
- `code` (String 50, Unique, Indexed)
- `district` (String 100)
- `state` (String 100)
- `total_member_farmers` (Integer)

### 3. `farmer_profiles`
- `id` (PK, Integer)
- `user_id` (FK -> `users.id`)
- `fpo_id` (FK -> `fpos.id`, Nullable)
- `village` (String 100)
- `block` (String 100)
- `district` (String 100)
- `state` (String 100)
- `latitude`, `longitude` (Float)

### 4. `farms`
- `id` (PK, Integer)
- `farmer_id` (FK -> `farmer_profiles.id`)
- `farm_name` (String 100)
- `total_area_acres` (Float)
- `soil_type` (String 50): `loam`, `clay`, `sandy_loam`, `black_cotton`
- `irrigation_type` (String 50): `drip`, `sprinkler`, `flood`
- `pump_hp` (Float): e.g. 5.0, 7.5
- `pump_type` (String 30): `electric`, `diesel`
- `discharge_rate_lps` (Float)
- `village`, `district` (String 100)
- `latitude`, `longitude` (Float)

### 5. `crops`
- `id` (PK, Integer)
- `farm_id` (FK -> `farms.id`)
- `crop_name` (String 50): Tomato, Chilli, Rice, etc.
- `variety` (String 50)
- `planting_date` (String 20): YYYY-MM-DD
- `current_stage` (String 50): seedling, vegetative, flowering, fruiting, maturity
- `season` (String 30): Kharif, Rabi, Zaid
- `is_active` (Boolean)

### 6. `advisories`
- `id` (PK, Integer)
- `advisory_uuid` (String 50, Unique, Indexed)
- `crop_id` (FK -> `crops.id`)
- `crop_name` (String 50)
- `growth_stage` (String 50)
- `irrigation_action` (String 50): SKIP IRRIGATION, REDUCE IRRIGATION, IRRIGATE NOW
- `urgency` (String 20)
- `estimated_water_litres` (Float)
- `potential_water_saved_litres` (Float)
- `estimated_energy_kwh` (Float)
- `potential_energy_saved_kwh` (Float)
- `estimated_cost_inr` (Float)
- `disease_detected` (String 100)
- `disease_confidence` (Float)
- `disease_severity` (String 30)
- `summary`, `why_rationale`, `treatment_recommendations` (Text)
- `full_payload` (JSON)
- `created_at` (DateTime)

### 7. `feedbacks`
- `id` (PK, Integer)
- `feedback_uuid` (String 50, Unique, Indexed)
- `advisory_id` (FK -> `advisories.id`)
- `advisory_uuid` (String 50)
- `action_taken` (String 150)
- `water_used_litres`, `energy_used_kwh` (Float)
- `crop_condition_after` (String 50)
- `yield_outcome_kg` (Float)
- `farmer_comment` (Text)
- `curated_for_retraining` (Boolean)

### 8. `system_audit_logs`
- `id` (PK, Integer)
- `event_type` (String 50)
- `agent_name` (String 50)
- `request_id` (String 50)
- `duration_ms` (Float)
- `status` (String 20)
- `details` (JSON)
