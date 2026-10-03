# AgriEdge AI & Agent Architecture

AgriEdge implements an orchestrated multi-agent network where each agent specializes in a distinct domain of agricultural physics, meteorology, foliar vision, or extension agronomy.

---

## 1. VisionAgent

- **Image Quality Validation:**
  - Rejects resolution $< 200 \times 200$ px (`LOW_RESOLUTION`).
  - Rejects mean luminance $< 35.0$ (`IMAGE_TOO_DARK`) or $> 235.0$ with low variance (`IMAGE_OVEREXPOSED`).
  - Measures sharpness via Laplacian variance on pixel matrix; rejects $< 30.0$ (`IMAGE_BLURRY`).
- **Provider Abstraction:**
  - `LocalVisionProvider`: Analyzes spectral chlorosis, necrosis, and powdery mildew ratios.
  - `RemoteVisionProvider`: Interfaces with remote multimodal endpoints (e.g. OpenAI/OpenRouter) when configured via environment variables.
- **Output:** Disease classification, confidence (0.0 to 1.0), severity, affected leaf area %, visual explanation, and agronomist verification flag when confidence $< 0.80$.

---

## 2. ContextAgent & CropStageAgent

- Computes days elapsed since sowing.
- Dynamically assigns phenological growth stages:
  1. **Seedling**: High desiccation sensitivity, low volumetric demand.
  2. **Vegetative**: Moderate water sensitivity, rapid canopy expansion.
  3. **Flowering**: **CRITICAL** stage where moisture stress induces blossom drop.
  4. **Fruiting**: **CRITICAL** stage where moisture deficit causes blossom end rot and fruit cracking.
  5. **Maturity**: Terminal ripening; reduced irrigation recommended to prevent fruit rots.
- Allows farmer or agronomist manual overrides.

---

## 3. WeatherAgent & RainfallAgent

- OpenWeatherMap integration with 15-minute in-memory caching to eliminate redundant external API hits.
- Isolated local development agro-meteorological simulator badged clearly as `Local development fallback`.
- **RainfallAgent Evaluation:**
  - Rain risk classification (`LOW`, `MODERATE`, `HIGH`).
  - Waterlogging and drainage alert.
  - Dry spell detection ($\ge 4$ consecutive rainless days).
  - Safe irrigation window recommendation.

---

## 4. EnergyWaterTriageAgent (Core Differentiator)

- Computes reference evapotranspiration ($ET_0$) using standard FAO-56 Penman-Monteith equation.
- Applies crop coefficient ($K_c$) according to crop and growth stage.
- Deducts USDA Soil Conservation Service (SCS) effective rainfall ($P_e$).
- Evaluates net and gross irrigation requirements across drip (90%), sprinkler (75%), and flood (60%) irrigation methods.
- Estimates pump electrical consumption ($kWh = HP \times 0.7457 \times \text{hours}$) and diesel consumption ($0.25 L / HP\cdot hr$).
- Evaluates operational cost in INR.

---

## 5. KnowledgeAgent (RAG & Safety Guardrails)

- Curated knowledge repository built from verified publications of:
  - Indian Council of Agricultural Research (ICAR)
  - Tamil Nadu Agricultural University (TNAU)
  - State Agricultural Extension Bulletins
  - Bureau of Energy Efficiency (BEE) Agricultural DSM guidelines
- **Prompt Injection Defense:** Strips control tokens, system override phrases, and markdown instruction injections before passing context to LLM synthesizers.
- Generates exact citations for treatments, dosages, and safety intervals.

---

## 6. OutcomeAgent & Continuous Learning Loop

- Compares predicted irrigation actions vs actual field results.
- Calculates advisory adherence, water variance %, energy variance %, and crop recovery score.
- **Safety Policy:** Does **not** automatically trigger unchecked model fine-tuning from unverified user reports. High-scoring samples ($\ge 80\%$) with substantive feedback are flagged into an agronomist verification pool.
