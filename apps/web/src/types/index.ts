export type UserRole = 'FARMER' | 'FPO_ADMIN' | 'AGRONOMIST' | 'SYSTEM_ADMIN';

export type LanguageCode = 'en' | 'hi' | 'ta';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  language_preference: LanguageCode;
  village?: string;
  district?: string;
}

export interface Farm {
  id: number;
  farm_name: string;
  total_area_acres: float;
  soil_type: string;
  irrigation_type: string;
  pump_hp: number;
  pump_type: string;
  discharge_rate_lps: number;
  village: string;
  district: string;
  latitude: number;
  longitude: number;
  active_crop: string;
  variety?: string;
  planting_date?: string;
  current_stage?: string;
}

type float = number;

export interface AdvisoryPayload {
  advisory_id: string;
  created_at: number;
  summary: string;
  crop_context: {
    crop: string;
    variety: string;
    active_stage: string;
    days_elapsed: number;
    stage_progress_pct: number;
    water_sensitivity: string;
    farm_acres: number;
    soil_type: string;
    irrigation_method: string;
  };
  water: {
    action: string;
    urgency: string;
    et0_mm_day: number;
    kc: number;
    etc_mm_day: number;
    estimated_gross_volume_litres: number;
    potential_water_saved_litres: number;
    effective_rainfall_mm: number;
    why: string;
    badge: 'ESTIMATED' | 'MEASURED' | 'USER REPORTED';
  };
  energy: {
    pump_hp: number;
    pump_type: string;
    power_kw: number;
    estimated_runtime_hours: number;
    energy_consumed: number;
    energy_unit: string;
    estimated_cost_inr: number;
    potential_saved_energy: number;
    potential_saved_cost_inr: number;
    badge: 'ESTIMATED';
  };
  crop_health: {
    detected: string;
    confidence: number;
    severity: string;
    affected_area_pct: number;
    visual_explanation: string;
    requires_verification: boolean;
    badge: 'MEASURED' | 'ESTIMATED' | 'USER REPORTED';
  };
  what_to_do: string[];
  what_not_to_do: string[];
  weather_context: {
    temperature_c: number;
    humidity_pct: number;
    condition: string;
    rainfall_24h_mm: number;
    rain_risk: string;
    irrigation_window: string;
    is_fallback: boolean;
    data_source: string;
    badge: string;
  };
  treatment: string;
  citations: Array<{ title: string; source: string; citations: string }>;
  safety_note: string;
  execution_metadata: {
    request_id: string;
    total_duration_ms: number;
    agents_involved: Array<{
      agent_name: string;
      duration_ms: number;
      status: string;
    }>;
  };
}

export interface DiseaseHotspot {
  cluster_id: string;
  village: string;
  block: string;
  district: string;
  latitude: number;
  longitude: number;
  crop: string;
  disease: string;
  severity: string;
  active_cases: number;
  affected_area_acres: number;
  recommended_action: string;
}
