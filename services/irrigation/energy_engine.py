"""
AgriEdge Irrigation Energy & Pump Optimization Engine
Calculates electrical kWh or diesel fuel requirements, estimated pumping runtime,
energy tariffs, and potential energy savings when irrigation is optimized or avoided.
"""

from typing import Dict, Any


def calculate_pump_energy_and_cost(
    volume_litres: float,
    pump_hp: float = 5.0,
    pump_type: str = "electric",
    discharge_lps: float = 8.0,
    electricity_tariff_inr_kwh: float = 6.50,
    diesel_price_inr_litre: float = 92.00,
    baseline_volume_litres: float = 0.0,
) -> Dict[str, Any]:
    """
    Computes runtime, energy units (kWh or Diesel Litres), financial cost,
    and potential savings.
    
    Discharge rate: litres per second (lps). Typical agricultural 5HP pump: ~7-10 lps.
    Power: 1 HP = 0.7457 kW. Motor efficiency ~ 80% -> Electrical draw = HP * 0.7457 / 0.80 kW.
    Diesel: ~0.25 litres of diesel per HP-hour for small agricultural pump sets.
    """
    hp = max(0.5, pump_hp)
    lps = max(1.0, discharge_lps)
    
    # 1. Pump runtime in hours
    # runtime_sec = volume_litres / discharge_lps
    runtime_hours = round(volume_litres / (lps * 3600.0), 2) if volume_litres > 0 else 0.0
    
    is_electric = pump_type.lower().strip() != "diesel"

    if is_electric:
        # Electrical draw: kW = HP * 0.7457
        power_kw = round(hp * 0.7457, 2)
        # Energy in kWh
        energy_kwh = round(power_kw * runtime_hours, 2)
        estimated_cost_inr = round(energy_kwh * electricity_tariff_inr_kwh, 2)
        energy_unit = "kWh"
        energy_value = energy_kwh
    else:
        # Diesel consumption: 0.25 L/HP-hr
        power_kw = round(hp * 0.7457, 2)
        diesel_litres = round(runtime_hours * hp * 0.25, 2)
        estimated_cost_inr = round(diesel_litres * diesel_price_inr_litre, 2)
        energy_unit = "Litres (Diesel)"
        energy_value = diesel_litres

    # Baseline comparison (savings calculation if irrigation was skipped or reduced)
    potential_saved_volume = max(0.0, baseline_volume_litres - volume_litres)
    baseline_runtime_hours = round(baseline_volume_litres / (lps * 3600.0), 2) if baseline_volume_litres > 0 else 0.0
    
    if is_electric:
        baseline_kwh = round(power_kw * baseline_runtime_hours, 2)
        potential_saved_energy = round(max(0.0, baseline_kwh - energy_kwh), 2)
        potential_saved_cost_inr = round(potential_saved_energy * electricity_tariff_inr_kwh, 2)
    else:
        baseline_diesel = round(baseline_runtime_hours * hp * 0.25, 2)
        potential_saved_energy = round(max(0.0, baseline_diesel - energy_value), 2)
        potential_saved_cost_inr = round(potential_saved_energy * diesel_price_inr_litre, 2)

    return {
        "pump_hp": hp,
        "pump_type": "electric" if is_electric else "diesel",
        "power_kw": power_kw,
        "discharge_rate_lps": lps,
        "estimated_runtime_hours": runtime_hours,
        "energy_consumed": energy_value,
        "energy_unit": energy_unit,
        "estimated_cost_inr": estimated_cost_inr,
        "potential_saved_volume_litres": potential_saved_volume,
        "potential_saved_energy": potential_saved_energy,
        "potential_saved_cost_inr": potential_saved_cost_inr,
        "disclaimer": "All power, fuel and cost figures are estimated based on pump ratings and operating assumptions."
    }
