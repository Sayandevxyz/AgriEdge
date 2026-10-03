# AgriEdge Model Card & Verification Standards

## Model Details
- **Model Name:** AgriEdge Unified Agro-Triage Engine v1.0
- **Primary Modalities:** Computer Vision (RGB Leaf Lesions) + Penman-Monteith Thermodynamic Modeling + NLP (Multilingual intent recognition)
- **Mathematical Standard:** FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998)
- **Effective Precipitation Formulation:** USDA Soil Conservation Service (SCS) method

---

## Intended Use
- **Primary Users:** Smallholder farmers, Farmer Producer Organizations (FPOs), rural agricultural extension workers.
- **Intended Purpose:** To guide irrigation scheduling (irrigate now vs skip/reduce based on rain forecasts) and identify common foliar fungal/bacterial leaf lesions without requiring physical in-situ sensors.

---

## Limitations & Disclaimers
1. **No Sensor Claim:** Soil water status is labeled as *"Estimated soil water status"*, never *"Measured soil moisture"*.
2. **No Guaranteed Savings:** Water and power savings are labeled as *"Potential savings"* or *"Estimated savings"*.
3. **No Unchecked Retraining:** Production models are never automatically retrained on unverified farmer feedback. High-efficacy feedback is sequestered into an agronomist review queue.
4. **Market Data Transparency:** When live Agmarknet API credentials are not configured, the interface explicitly displays *"Live market data unavailable"* rather than simulating false live prices.
