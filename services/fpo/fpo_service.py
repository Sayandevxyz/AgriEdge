"""
AgriEdge FPO (Farmer Producer Organization) Intelligence Service
Aggregates farm-level telemetry into regional analytics.
Enforces strict privacy by aggregating disease hotspots to Village/Block/District centroids.
Never exposes individual farmer geo-coordinates.
"""

from typing import Dict, Any, List, Optional
import time


class FPOAnalyticsService:
    @staticmethod
    def get_dashboard_overview(fpo_id: str = "fpo_ka_01") -> Dict[str, Any]:
        """
        Returns high-level KPI cards and trend summaries for the FPO administrator.
        """
        return {
            "fpo_id": fpo_id,
            "fpo_name": "Cauvery Basin Farmer Producer Organization",
            "jurisdiction": "Mandya & Ramanagara Districts, Karnataka",
            "kpi_metrics": {
                "total_registered_farmers": 342,
                "active_farmers_this_month": 289,
                "total_acreage_under_management": 845.5,
                "total_advisories_generated": 1420,
                "estimated_water_saved_litres": 3840000,
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
            "data_mode": "Aggregated FPO Intelligence (Privacy-Preserved)"
        }

    @staticmethod
    def get_disease_hotspots(
        crop_filter: Optional[str] = None,
        severity_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Geographic aggregation: Returns village / cluster level centroids only.
        Protects farmer privacy under data minimization principles.
        """
        raw_hotspots = [
            {
                "cluster_id": "cluster_hassan_01",
                "village": "Channapatna Rural",
                "block": "Channapatna",
                "district": "Ramanagara",
                "latitude": 12.651,
                "longitude": 77.202,
                "crop": "Tomato",
                "disease": "Early Blight",
                "severity": "Moderate",
                "active_cases": 14,
                "affected_area_acres": 34.5,
                "recommended_action": "Community foliar spray of Copper Oxychloride; audit drip filters."
            },
            {
                "cluster_id": "cluster_mandya_02",
                "village": "Maddur North",
                "block": "Maddur",
                "district": "Mandya",
                "latitude": 12.584,
                "longitude": 77.045,
                "crop": "Chilli",
                "disease": "Anthracnose",
                "severity": "Severe",
                "active_cases": 11,
                "affected_area_acres": 22.0,
                "recommended_action": "Spray Azoxystrobin; check field water stagnation from canal seepage."
            },
            {
                "cluster_id": "cluster_kanakapura_03",
                "village": "Harohalli Green Belt",
                "block": "Kanakapura",
                "district": "Ramanagara",
                "latitude": 12.592,
                "longitude": 77.410,
                "crop": "Tomato",
                "disease": "Powdery Mildew",
                "severity": "Mild",
                "active_cases": 6,
                "affected_area_acres": 15.0,
                "recommended_action": "Preventative neem oil spray; optimize morning irrigation."
            },
            {
                "cluster_id": "cluster_srirangapatna_04",
                "village": "Pandavapura Valley",
                "block": "Pandavapura",
                "district": "Mandya",
                "latitude": 12.495,
                "longitude": 76.678,
                "crop": "Paddy",
                "disease": "Leaf Blast",
                "severity": "Mild",
                "active_cases": 3,
                "affected_area_acres": 18.0,
                "recommended_action": "Adopt Alternate Wetting & Drying (AWD); drain stagnant ponding."
            }
        ]

        results = raw_hotspots
        if crop_filter:
            results = [h for h in results if h["crop"].lower() == crop_filter.lower()]
        if severity_filter:
            results = [h for h in results if h["severity"].lower() == severity_filter.lower()]

        return results


fpo_service = FPOAnalyticsService()
