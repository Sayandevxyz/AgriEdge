"""
AgriEdge FAO-56 Penman-Monteith Evapotranspiration & Water Requirement Engine
Compliant with FAO Irrigation and Drainage Paper 56 standard calculations.
"""

import math
from typing import Dict, Any, Optional

# Standard FAO-56 Crop Coefficients (Kc) across growth stages
# [Kc_ini, Kc_mid, Kc_end, total_duration_days, [stage_ratios]]
CROP_KC_DATABASE: Dict[str, Dict[str, Any]] = {
    "tomato": {
        "name": "Tomato",
        "kc_ini": 0.60,
        "kc_mid": 1.15,
        "kc_end": 0.80,
        "stage_days": {"seedling": 25, "vegetative": 35, "flowering": 40, "fruiting": 30, "maturity": 20},
        "root_depth_m": 0.7,
        "critical_depletion": 0.40,
    },
    "chilli": {
        "name": "Chilli / Pepper",
        "kc_ini": 0.60,
        "kc_mid": 1.05,
        "kc_end": 0.85,
        "stage_days": {"seedling": 20, "vegetative": 35, "flowering": 45, "fruiting": 35, "maturity": 20},
        "root_depth_m": 0.6,
        "critical_depletion": 0.35,
    },
    "rice": {
        "name": "Paddy / Rice",
        "kc_ini": 1.05,
        "kc_mid": 1.20,
        "kc_end": 0.90,
        "stage_days": {"seedling": 20, "vegetative": 30, "flowering": 35, "fruiting": 30, "maturity": 15},
        "root_depth_m": 0.5,
        "critical_depletion": 0.20,
    },
    "wheat": {
        "name": "Wheat",
        "kc_ini": 0.40,
        "kc_mid": 1.15,
        "kc_end": 0.40,
        "stage_days": {"seedling": 15, "vegetative": 30, "flowering": 35, "fruiting": 30, "maturity": 15},
        "root_depth_m": 1.0,
        "critical_depletion": 0.55,
    },
    "cotton": {
        "name": "Cotton",
        "kc_ini": 0.45,
        "kc_mid": 1.15,
        "kc_end": 0.65,
        "stage_days": {"seedling": 30, "vegetative": 50, "flowering": 55, "fruiting": 45, "maturity": 25},
        "root_depth_m": 1.2,
        "critical_depletion": 0.65,
    },
    "maize": {
        "name": "Maize / Corn",
        "kc_ini": 0.30,
        "kc_mid": 1.20,
        "kc_end": 0.50,
        "stage_days": {"seedling": 20, "vegetative": 35, "flowering": 35, "fruiting": 30, "maturity": 15},
        "root_depth_m": 1.0,
        "critical_depletion": 0.55,
    },
    "groundnut": {
        "name": "Groundnut / Peanut",
        "kc_ini": 0.40,
        "kc_mid": 1.15,
        "kc_end": 0.60,
        "stage_days": {"seedling": 25, "vegetative": 35, "flowering": 35, "fruiting": 30, "maturity": 15},
        "root_depth_m": 0.8,
        "critical_depletion": 0.50,
    }
}

# Irrigation system application efficiencies (eta_a)
IRRIGATION_EFFICIENCY = {
    "drip": 0.90,
    "sprinkler": 0.75,
    "flood": 0.60,
    "furrow": 0.65,
    "basin": 0.65
}

# Soil Available Water Capacity (AWC in mm/m)
SOIL_WATER_CAPACITY = {
    "clay": 180.0,
    "sandy_clay": 160.0,
    "clay_loam": 175.0,
    "loam": 140.0,
    "sandy_loam": 105.0,
    "sand": 60.0,
    "black_cotton": 190.0,
    "red_soil": 125.0
}


def calculate_fao56_et0(
    temp_c: float,
    temp_min_c: Optional[float] = None,
    temp_max_c: Optional[float] = None,
    humidity_pct: float = 60.0,
    wind_speed_2m_ms: float = 2.0,
    solar_radiation_mj_m2: Optional[float] = None,
    latitude_deg: float = 13.0,
    day_of_year: int = 180,
    altitude_m: float = 100.0,
) -> float:
    """
    Computes Reference Evapotranspiration ET0 (mm/day) using FAO-56 Penman-Monteith equation.
    All formulas follow FAO Irrigation and Drainage Paper 56 Chapter 3 & 4.
    """
    # 1. Atmospheric pressure (P in kPa) - FAO-56 Eq. 7
    P = 101.3 * math.pow((293.0 - 0.0065 * altitude_m) / 293.0, 5.26)

    # 2. Psychrometric constant (gamma in kPa / C) - FAO-56 Eq. 8
    gamma = 0.000665 * P

    # 3. Saturation vapour pressure (e_s in kPa) - FAO-56 Eq. 11, 12
    if temp_min_c is not None and temp_max_c is not None:
        e_sat_max = 0.6108 * math.exp((17.27 * temp_max_c) / (temp_max_c + 237.3))
        e_sat_min = 0.6108 * math.exp((17.27 * temp_min_c) / (temp_min_c + 237.3))
        e_s = (e_sat_max + e_sat_min) / 2.0
        t_mean = (temp_max_c + temp_min_c) / 2.0
    else:
        e_s = 0.6108 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
        t_mean = temp_c

    # 4. Actual vapour pressure (e_a in kPa) - FAO-56 Eq. 17
    e_a = e_s * (max(1.0, min(100.0, humidity_pct)) / 100.0)

    # 5. Slope of saturation vapour pressure curve (Delta in kPa / C) - FAO-56 Eq. 13
    delta = (4098.0 * (0.6108 * math.exp((17.27 * t_mean) / (t_mean + 237.3)))) / math.pow(t_mean + 237.3, 2)

    # 6. Extraterrestrial Radiation Ra (MJ / m^2 / day) - FAO-56 Eq. 21 to 24
    phi = (math.pi / 180.0) * latitude_deg
    dr = 1.0 + 0.033 * math.cos(2.0 * math.pi * day_of_year / 365.0)
    declination = 0.409 * math.sin((2.0 * math.pi * day_of_year / 365.0) - 1.39)
    ws_val = -math.tan(phi) * math.tan(declination)
    ws_val = max(-1.0, min(1.0, ws_val))
    ws = math.acos(ws_val)
    Gsc = 0.0820  # MJ / m^2 / min
    Ra = (24.0 * 60.0 / math.pi) * Gsc * dr * (
        ws * math.sin(phi) * math.sin(declination) +
        math.cos(phi) * math.cos(declination) * math.sin(ws)
    )

    # 7. Net Radiation (Rn in MJ / m^2 / day)
    if solar_radiation_mj_m2 is None:
        # Hargreaves estimation for Rs from Ra: Rs = kRs * sqrt(Tmax - Tmin) * Ra
        t_range = max(2.0, (temp_max_c - temp_min_c) if (temp_max_c and temp_min_c) else 10.0)
        Rs = 0.16 * math.sqrt(t_range) * Ra
    else:
        Rs = solar_radiation_mj_m2

    # Clear-sky radiation Rso - FAO-56 Eq. 37
    Rso = (0.75 + 2e-5 * altitude_m) * Ra
    # Net shortwave Rns (albedo = 0.23 for reference grass) - FAO-56 Eq. 38
    Rns = (1.0 - 0.23) * Rs

    # Net longwave Rnl - FAO-56 Eq. 39
    sigma = 4.903e-9  # Stefan-Boltzmann constant MJ / K^4 / m^2 / day
    t_k = t_mean + 273.16
    f_cloud = max(0.05, min(1.0, (1.35 * (Rs / max(1e-5, Rso)) - 0.35)))
    Rnl = sigma * math.pow(t_k, 4) * (0.34 - 0.14 * math.sqrt(max(0.0, e_a))) * f_cloud
    Rn = max(0.1, Rns - Rnl)

    # 8. Soil heat flux G (assumed ~ 0 for daily calculation) - FAO-56 Eq. 42
    G = 0.0

    # 9. Penman-Monteith ET0 Equation - FAO-56 Eq. 6
    u2 = max(0.5, wind_speed_2m_ms)
    numerator = 0.408 * delta * (Rn - G) + gamma * (900.0 / (t_mean + 273.0)) * u2 * (e_s - e_a)
    denominator = delta + gamma * (1.0 + 0.34 * u2)

    et0 = numerator / denominator
    return max(0.5, round(et0, 2))


def get_crop_coefficient(crop_key: str, growth_stage: str) -> float:
    """
    Returns the appropriate Kc for a given crop and growth stage.
    Stages: seedling, vegetative, flowering, fruiting, maturity
    """
    key = crop_key.lower().strip()
    stage = growth_stage.lower().strip()
    crop_info = CROP_KC_DATABASE.get(key, CROP_KC_DATABASE["tomato"])

    if stage in ["seedling", "initial", "germination"]:
        return crop_info["kc_ini"]
    elif stage in ["vegetative", "development"]:
        # Linear interpolation between ini and mid
        return round((crop_info["kc_ini"] + crop_info["kc_mid"]) / 2.0, 2)
    elif stage in ["flowering", "fruiting", "mid_season", "reproductive"]:
        return crop_info["kc_mid"]
    elif stage in ["maturity", "late", "harvest", "ripening"]:
        return crop_info["kc_end"]
    return crop_info["kc_mid"]


def calculate_effective_rainfall(rainfall_mm: float) -> float:
    """
    Calculates effective rainfall (Pe) using the USDA Soil Conservation Service (SCS) method.
    Accounts for runoff and deep percolation.
    """
    P = max(0.0, rainfall_mm)
    if P <= 0.0:
        return 0.0
    if P <= 250.0:
        Pe = P * (125.0 - 0.2 * P) / 125.0
    else:
        Pe = 125.0 + 0.1 * P
    return max(0.0, round(Pe, 2))


def calculate_irrigation_requirement(
    et0_mm_day: float,
    crop_key: str,
    growth_stage: str,
    farm_acres: float,
    irrigation_method: str = "drip",
    forecast_rainfall_24h_mm: float = 0.0,
    forecast_rainfall_48h_mm: float = 0.0,
    soil_type: str = "loam",
) -> Dict[str, Any]:
    """
    Performs complete FAO-56 crop water requirement and irrigation triage.
    Returns transparent, verifiable calculations with explainable rationale.
    """
    crop_data = CROP_KC_DATABASE.get(crop_key.lower().strip(), CROP_KC_DATABASE["tomato"])
    kc = get_crop_coefficient(crop_key, growth_stage)
    
    # ETc = ET0 * Kc
    etc_mm_day = round(et0_mm_day * kc, 2)

    # Effective rainfall from forecast
    pe_24h = calculate_effective_rainfall(forecast_rainfall_24h_mm)
    pe_48h = calculate_effective_rainfall(forecast_rainfall_48h_mm)
    total_effective_rain_mm = round(pe_24h + (0.5 * pe_48h), 2)

    # Net irrigation requirement IN_net (mm)
    net_irrigation_mm = max(0.0, round(etc_mm_day - total_effective_rain_mm, 2))

    # Application efficiency
    eta_a = IRRIGATION_EFFICIENCY.get(irrigation_method.lower().strip(), 0.80)

    # Gross irrigation requirement IN_gross (mm)
    gross_irrigation_mm = round(net_irrigation_mm / eta_a, 2) if net_irrigation_mm > 0 else 0.0

    # Volume calculation in Litres
    # 1 mm water on 1 m^2 = 1 Litre
    # 1 acre = 4046.86 m^2
    area_m2 = farm_acres * 4046.86
    gross_volume_litres = round(gross_irrigation_mm * area_m2)
    baseline_volume_litres = round((etc_mm_day / eta_a) * area_m2)

    # Potential water savings if irrigation is reduced or postponed due to rainfall
    water_saved_litres = max(0, baseline_volume_litres - gross_volume_litres)

    # Triage decision logic
    # IRRIGATE NOW / IRRIGATE LATER / REDUCE IRRIGATION / SKIP IRRIGATION / CHECK FIELD BEFORE IRRIGATION
    if forecast_rainfall_24h_mm >= etc_mm_day or total_effective_rain_mm >= etc_mm_day:
        action = "SKIP IRRIGATION"
        urgency = "low"
        why = (
            f"Forecast rainfall of {forecast_rainfall_24h_mm:.1f} mm within 24 hours meets or exceeds "
            f"the daily crop evapotranspiration requirement ({etc_mm_day:.1f} mm). "
            f"Postponing irrigation saves water and prevents root zone waterlogging."
        )
    elif forecast_rainfall_24h_mm >= 3.5 and total_effective_rain_mm >= 0.3 * etc_mm_day:
        action = "REDUCE IRRIGATION"
        urgency = "medium"
        why = (
            f"Moderate rainfall of {forecast_rainfall_24h_mm:.1f} mm is forecast. "
            f"Applying a reduced volume of {gross_volume_litres:,} L accounts for partial rain replenishment."
        )
    elif forecast_rainfall_48h_mm >= 15.0:
        action = "IRRIGATE LATER"
        urgency = "low"
        why = (
            f"Significant rainfall of {forecast_rainfall_48h_mm:.1f} mm is forecast within 48 hours. "
            f"If soil moisture is not depleted, delay irrigation until rainfall occurs."
        )
    elif gross_irrigation_mm <= 0.5:
        action = "SKIP IRRIGATION"
        urgency = "low"
        why = "Estimated soil water status is sufficient. Daily crop water loss is negligible."
    else:
        action = "IRRIGATE NOW"
        urgency = "high"
        why = (
            f"Daily crop evapotranspiration ({etc_mm_day:.1f} mm) exceeds forecast precipitation. "
            f"Estimated water requirement is {gross_volume_litres:,} Litres ({gross_irrigation_mm:.1f} mm) "
            f"for {farm_acres:.1f} acres."
        )

    # Soil water status note (explicitly labeled 'estimated' per instructions)
    soil_awc = SOIL_WATER_CAPACITY.get(soil_type.lower().strip(), 140.0)
    root_depth = crop_data["root_depth_m"]
    total_available_water_mm = round(soil_awc * root_depth, 1)

    return {
        "et0_mm_day": et0_mm_day,
        "kc": kc,
        "etc_mm_day": etc_mm_day,
        "forecast_rainfall_24h_mm": forecast_rainfall_24h_mm,
        "effective_rainfall_mm": total_effective_rain_mm,
        "net_irrigation_mm": net_irrigation_mm,
        "gross_irrigation_mm": gross_irrigation_mm,
        "irrigation_efficiency": eta_a,
        "farm_acres": farm_acres,
        "gross_volume_litres": gross_volume_litres,
        "baseline_volume_litres": baseline_volume_litres,
        "water_saved_litres": water_saved_litres,
        "action": action,
        "urgency": urgency,
        "why": why,
        "soil_context": {
            "soil_type": soil_type,
            "estimated_available_water_capacity_mm": total_available_water_mm,
            "root_depth_m": root_depth,
            "status_label": "Estimated soil water status"
        }
    }
