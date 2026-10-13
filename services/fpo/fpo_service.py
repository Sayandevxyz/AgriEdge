"""
AgriEdge FPO (Farmer Producer Organization) Intelligence Service
Aggregates farm-level telemetry into regional analytics.
Enforces strict privacy by aggregating disease hotspots to district centroids only.
Never exposes individual farmer geo-coordinates.
"""

import os
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from apps.api.models import FPO, FarmerProfile, Farm, Crop, Advisory, Feedback

# District Centroids in Karnataka and neighbouring regions for privacy-preserving disease aggregation
DISTRICT_CENTROIDS = {
    "mandya": (12.52, 76.89),
    "ramanagara": (12.72, 77.28),
    "bengaluru": (12.97, 77.59),
    "bengaluru rural": (13.28, 77.58),
    "hassan": (13.00, 76.10),
    "mysuru": (12.29, 76.63),
    "tumakuru": (13.34, 77.10),
    "kolar": (13.13, 78.13),
    "chikkaballapura": (13.43, 77.72),
}

SEEDED_DEMO_DASHBOARD: Dict[str, Any] = {
    "fpo_id": "fpo_ka_01",
    "fpo_name": "Cauvery Basin Farmer Producer Organization",
    "jurisdiction": "Mandya & Ramanagara Districts, Karnataka",
    "is_demo": True,
    "badge": "Demo data",
    "empty_state": False,
    "kpi_metrics": {
        "total_registered_farmers": 342,
        "active_farmers_this_month": 289,
        "total_acreage_under_management": 845.5,
        "total_advisories_generated": 1420,
        "estimated_water_saved_litres": 3840000.0,
        "estimated_energy_saved_kwh": 4120.0,
        "estimated_cost_saved_inr": 26780.0,
        "advisory_adherence_rate_pct": 82.4,
        "active_disease_alerts": 3
    },
    "crop_distribution": [
        {"crop": "Tomato", "acres": 310.0, "farmers": 128, "health_pct": 86},
        {"crop": "Chilli", "acres": 220.5, "farmers": 84, "health_pct": 79},
        {"crop": "Paddy / Rice", "acres": 185.0, "farmers": 72, "health_pct": 92},
        {"crop": "Ragi / Millet", "acres": 80.0, "farmers": 36, "health_pct": 95},
        {"crop": "Groundnut", "acres": 50.0, "farmers": 22, "health_pct": 88}
    ],
    "water_trends_7d": [
        {"day": "Mon", "estimated_demand_kL": 480, "water_delivered_kL": 410, "water_saved_kL": 70},
        {"day": "Tue", "estimated_demand_kL": 520, "water_delivered_kL": 380, "water_saved_kL": 140},
        {"day": "Wed (Rain)", "estimated_demand_kL": 510, "water_delivered_kL": 95, "water_saved_kL": 415},
        {"day": "Thu", "estimated_demand_kL": 490, "water_delivered_kL": 120, "water_saved_kL": 370},
        {"day": "Fri", "estimated_demand_kL": 460, "water_delivered_kL": 340, "water_saved_kL": 120},
        {"day": "Sat", "estimated_demand_kL": 530, "water_delivered_kL": 430, "water_saved_kL": 100},
        {"day": "Sun", "estimated_demand_kL": 550, "water_delivered_kL": 460, "water_saved_kL": 90}
    ],
    "energy_trends_7d": [
        {"day": "Mon", "kwh_consumed": 580, "kwh_saved": 95},
        {"day": "Tue", "kwh_consumed": 540, "kwh_saved": 190},
        {"day": "Wed", "kwh_consumed": 135, "kwh_saved": 560},
        {"day": "Thu", "kwh_consumed": 170, "kwh_saved": 500},
        {"day": "Fri", "kwh_consumed": 480, "kwh_saved": 160},
        {"day": "Sat", "kwh_consumed": 610, "kwh_saved": 135},
        {"day": "Sun", "kwh_consumed": 640, "kwh_saved": 120}
    ],
    "disease_breakdown": [
        {"disease": "Early Blight", "crop": "Tomato", "incident_count": 28, "severity": "Moderate"},
        {"disease": "Anthracnose", "crop": "Chilli", "incident_count": 19, "severity": "Moderate"},
        {"disease": "Powdery Mildew", "crop": "Tomato / Chilli", "incident_count": 9, "severity": "Mild"},
        {"disease": "Leaf Blast", "crop": "Paddy", "incident_count": 4, "severity": "Low"}
    ],
    "data_mode": "Seeded Demo Dataset (DEMO_DATA=true)"
}

SEEDED_DEMO_HOTSPOTS: List[Dict[str, Any]] = [
    {
        "cluster_id": "demo_cluster_ramanagara_01",
        "village": "District Level Aggregation",
        "block": "Ramanagara Central",
        "district": "Ramanagara",
        "latitude": 12.72,
        "longitude": 77.28,
        "crop": "Tomato",
        "disease": "Early Blight",
        "severity": "Moderate",
        "active_cases": 14,
        "affected_area_acres": 34.5,
        "recommended_action": "Community foliar spray of Copper Oxychloride; audit drip filters."
    },
    {
        "cluster_id": "demo_cluster_mandya_02",
        "village": "District Level Aggregation",
        "block": "Mandya Central",
        "district": "Mandya",
        "latitude": 12.52,
        "longitude": 76.89,
        "crop": "Chilli",
        "disease": "Anthracnose",
        "severity": "Severe",
        "active_cases": 11,
        "affected_area_acres": 22.0,
        "recommended_action": "Spray Azoxystrobin; check field water stagnation from canal seepage."
    },
    {
        "cluster_id": "demo_cluster_ramanagara_03",
        "village": "District Level Aggregation",
        "block": "Ramanagara South",
        "district": "Ramanagara",
        "latitude": 12.72,
        "longitude": 77.28,
        "crop": "Tomato",
        "disease": "Powdery Mildew",
        "severity": "Mild",
        "active_cases": 6,
        "affected_area_acres": 15.0,
        "recommended_action": "Preventative neem oil spray; optimize morning irrigation."
    },
    {
        "cluster_id": "demo_cluster_mandya_04",
        "village": "District Level Aggregation",
        "block": "Mandya North",
        "district": "Mandya",
        "latitude": 12.52,
        "longitude": 76.89,
        "crop": "Paddy",
        "disease": "Leaf Blast",
        "severity": "Mild",
        "active_cases": 3,
        "affected_area_acres": 18.0,
        "recommended_action": "Adopt Alternate Wetting & Drying (AWD); drain stagnant ponding."
    }
]


class FPOAnalyticsService:
    @staticmethod
    def _is_demo_requested(demo: Optional[bool] = None) -> bool:
        if demo is not None:
            return bool(demo)
        return os.getenv("DEMO_DATA", "").strip().lower() in ("true", "1", "yes")

    def get_dashboard_overview(
        self,
        db: Optional[Session] = None,
        fpo_id: Optional[str] = "fpo_ka_01",
        demo: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Computes KPIs dynamically from the database.
        Returns zeros + empty-state if no data exists.
        Serves seeded demo dataset if DEMO_DATA=true or demo=True.
        """
        if self._is_demo_requested(demo):
            return dict(SEEDED_DEMO_DASHBOARD)

        if db is None:
            return self._build_empty_response(fpo_id)

        # 1. Identify FPO if specified
        fpo_record = None
        if fpo_id:
            if str(fpo_id).isdigit():
                fpo_record = db.query(FPO).filter(FPO.id == int(fpo_id)).first()
            if not fpo_record:
                fpo_record = db.query(FPO).filter(FPO.code == str(fpo_id)).first()

        fpo_display_name = fpo_record.name if fpo_record else "Cauvery Basin Farmer Producer Organization"
        jurisdiction = f"{fpo_record.district}, {fpo_record.state}" if fpo_record else "Mandya & Ramanagara Districts, Karnataka"

        # 2. Farmers Count (FarmerProfile by fpo_id)
        farmer_q = db.query(FarmerProfile)
        if fpo_record:
            farmer_q = farmer_q.filter(FarmerProfile.fpo_id == fpo_record.id)
        total_farmers = farmer_q.count()
        farmer_ids = [fp.id for fp in farmer_q.all()]

        # 3. Acreage (sum Farm.total_area_acres)
        farm_q = db.query(func.sum(Farm.total_area_acres))
        if fpo_record:
            farm_q = farm_q.filter(
                (Farm.fpo_id == fpo_record.id) | 
                (Farm.farmer_id.in_(farmer_ids) if farmer_ids else False)
            )
        total_acreage = float(farm_q.scalar() or 0.0)

        # 4. Advisories (count Advisory)
        adv_q = db.query(Advisory)
        if fpo_record:
            adv_q = adv_q.join(Crop, Advisory.crop_id == Crop.id).join(Farm, Crop.farm_id == Farm.id).filter(
                (Farm.fpo_id == fpo_record.id) |
                (Farm.farmer_id.in_(farmer_ids) if farmer_ids else False)
            )
        total_advisories = adv_q.count()

        # If database has zero records for this FPO, return zeros with empty-state message
        if total_farmers == 0 and total_advisories == 0 and total_acreage == 0.0:
            return self._build_empty_response(fpo_id, fpo_display_name, jurisdiction)

        # 5. Potential Water / Energy / Cost Saved (sum Advisory.potential_*)
        water_saved = float(adv_q.with_entities(func.sum(Advisory.potential_water_saved_litres)).scalar() or 0.0)
        energy_saved = float(adv_q.with_entities(func.sum(Advisory.potential_energy_saved_kwh)).scalar() or 0.0)
        cost_saved = float(adv_q.with_entities(func.sum(Advisory.potential_cost_saved_inr)).scalar() or 0.0)

        # 6. Adherence (from Feedback)
        fb_q = db.query(Feedback)
        if fpo_record:
            fb_q = fb_q.join(Advisory, Feedback.advisory_id == Advisory.id).join(Crop, Advisory.crop_id == Crop.id).join(Farm, Crop.farm_id == Farm.id).filter(
                (Farm.fpo_id == fpo_record.id) |
                (Farm.farmer_id.in_(farmer_ids) if farmer_ids else False)
            )
        total_feedbacks = fb_q.count()
        if total_feedbacks > 0:
            adhered_count = fb_q.filter(
                (Feedback.action_taken.ilike("%adhered%")) |
                (Feedback.action_taken.ilike("%followed%")) |
                (Feedback.crop_condition_after.in_(["Improved", "Good", "Normal"]))
            ).count()
            adherence_rate = round((adhered_count / total_feedbacks) * 100.0, 1)
        else:
            adherence_rate = 0.0

        # 7. Crop Distribution (Crop grouped by name)
        crop_q = db.query(
            Crop.crop_name,
            func.sum(Farm.total_area_acres).label("acres"),
            func.count(distinct(Farm.farmer_id)).label("farmers")
        ).join(Farm, Crop.farm_id == Farm.id)
        if fpo_record:
            crop_q = crop_q.filter(
                (Farm.fpo_id == fpo_record.id) |
                (Farm.farmer_id.in_(farmer_ids) if farmer_ids else False)
            )
        crop_groups = crop_q.group_by(Crop.crop_name).all()
        crop_distribution = [
            {
                "crop": row[0],
                "acres": round(float(row[1] or 0), 1),
                "farmers": int(row[2] or 0),
                "health_pct": 88
            }
            for row in crop_groups
        ]

        # 8. Real Disease Breakdown from Advisory.disease_detected
        dis_q = db.query(
            Advisory.disease_detected,
            Advisory.crop_name,
            Advisory.disease_severity,
            func.count(Advisory.id).label("incident_count")
        ).filter(
            Advisory.disease_detected.isnot(None),
            Advisory.disease_detected != "",
            Advisory.disease_detected != "None"
        )
        if fpo_record:
            dis_q = dis_q.join(Crop, Advisory.crop_id == Crop.id).join(Farm, Crop.farm_id == Farm.id).filter(
                (Farm.fpo_id == fpo_record.id) |
                (Farm.farmer_id.in_(farmer_ids) if farmer_ids else False)
            )
        disease_rows = dis_q.group_by(Advisory.disease_detected, Advisory.crop_name, Advisory.disease_severity).all()
        disease_breakdown = [
            {
                "disease": row[0],
                "crop": row[1],
                "incident_count": int(row[3]),
                "severity": row[2] or "Moderate"
            }
            for row in disease_rows
        ]

        return {
            "fpo_id": fpo_record.code if fpo_record else (fpo_id or "fpo_ka_01"),
            "fpo_name": fpo_display_name,
            "jurisdiction": jurisdiction,
            "is_demo": False,
            "empty_state": False,
            "kpi_metrics": {
                "total_registered_farmers": total_farmers,
                "active_farmers_this_month": total_farmers,
                "total_acreage_under_management": round(total_acreage, 1),
                "total_advisories_generated": total_advisories,
                "estimated_water_saved_litres": round(water_saved, 1),
                "estimated_energy_saved_kwh": round(energy_saved, 1),
                "estimated_cost_saved_inr": round(cost_saved, 1),
                "advisory_adherence_rate_pct": adherence_rate,
                "active_disease_alerts": len(disease_breakdown)
            },
            "crop_distribution": crop_distribution,
            "water_trends_7d": [],
            "energy_trends_7d": [],
            "disease_breakdown": disease_breakdown,
            "data_mode": "Live Database Analytics"
        }

    def _build_empty_response(
        self,
        fpo_id: Optional[str] = "fpo_ka_01",
        fpo_name: str = "Cauvery Basin Farmer Producer Organization",
        jurisdiction: str = "Mandya & Ramanagara Districts, Karnataka"
    ) -> Dict[str, Any]:
        return {
            "fpo_id": fpo_id or "fpo_ka_01",
            "fpo_name": fpo_name,
            "jurisdiction": jurisdiction,
            "is_demo": False,
            "empty_state": True,
            "empty_state_message": "No farm telemetry or farmer records found in database. Seed data or switch to demo mode.",
            "kpi_metrics": {
                "total_registered_farmers": 0,
                "active_farmers_this_month": 0,
                "total_acreage_under_management": 0.0,
                "total_advisories_generated": 0,
                "estimated_water_saved_litres": 0.0,
                "estimated_energy_saved_kwh": 0.0,
                "estimated_cost_saved_inr": 0.0,
                "advisory_adherence_rate_pct": 0.0,
                "active_disease_alerts": 0
            },
            "crop_distribution": [],
            "water_trends_7d": [],
            "energy_trends_7d": [],
            "disease_breakdown": [],
            "data_mode": "Live Database Analytics (Empty State)"
        }

    def get_disease_hotspots(
        self,
        db: Optional[Session] = None,
        crop_filter: Optional[str] = None,
        severity_filter: Optional[str] = None,
        demo: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """
        Geographic aggregation: Returns district-level centroids only from real Advisory.disease_detected.
        Protects farmer privacy under data minimization principles.
        """
        if self._is_demo_requested(demo):
            results = list(SEEDED_DEMO_HOTSPOTS)
            if crop_filter:
                results = [h for h in results if h["crop"].lower() == crop_filter.lower()]
            if severity_filter:
                results = [h for h in results if h["severity"].lower() == severity_filter.lower()]
            return results

        if db is None:
            return []

        # Real hotspots from Advisory.disease_detected, grouped by Farm.district
        hotspot_q = db.query(
            Farm.district,
            Advisory.crop_name,
            Advisory.disease_detected,
            Advisory.disease_severity,
            func.count(Advisory.id).label("active_cases"),
            func.sum(Farm.total_area_acres).label("affected_area_acres")
        ).join(
            Crop, Advisory.crop_id == Crop.id
        ).join(
            Farm, Crop.farm_id == Farm.id
        ).filter(
            Advisory.disease_detected.isnot(None),
            Advisory.disease_detected != "",
            Advisory.disease_detected != "None"
        )

        if crop_filter:
            hotspot_q = hotspot_q.filter(func.lower(Advisory.crop_name) == crop_filter.lower())
        if severity_filter:
            hotspot_q = hotspot_q.filter(func.lower(Advisory.disease_severity) == severity_filter.lower())

        grouped_rows = hotspot_q.group_by(
            Farm.district,
            Advisory.crop_name,
            Advisory.disease_detected,
            Advisory.disease_severity
        ).all()

        hotspots = []
        for idx, row in enumerate(grouped_rows):
            district = row[0] or "Mandya"
            crop_name = row[1]
            disease = row[2]
            severity = row[3] or "Moderate"
            active_cases = int(row[4] or 0)
            affected_acres = round(float(row[5] or 0.0), 1)

            # District centroid mapping (Strictly district-level only, no farmer coords)
            coords = DISTRICT_CENTROIDS.get(district.lower(), (12.97, 77.59))

            hotspots.append({
                "cluster_id": f"hotspot_{district.lower().replace(' ', '_')}_{idx + 1}",
                "village": f"{district} District Aggregation",
                "block": "Centroid Area",
                "district": district,
                "latitude": coords[0],
                "longitude": coords[1],
                "crop": crop_name,
                "disease": disease,
                "severity": severity,
                "active_cases": active_cases,
                "affected_area_acres": affected_acres,
                "recommended_action": f"District-level foliar intervention recommended for {disease} in {district}."
            })

        return hotspots


fpo_service = FPOAnalyticsService()
