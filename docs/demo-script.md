# AgriEdge 3-Minute Hackathon Demo Script

> **Time Target:** 180 seconds  
> **Presenter Roles:** Farmer Persona (Ramesh) & FPO Administrator Persona

---

## 0:00 - 0:30 | The Hook & Product Problem
1. **Open Landing Page (`/`):**
   - Point to headline: *"AI That Helps Farmers Save Water, Energy & Yield."*
   - Show the live hero card: Explain that AgriEdge doesn't just diagnose a disease — it answers the operational question: *"Do I need to turn on my pump today?"*
   - Point out the **Judge Mode** banner: Transparent local development environment with zero fake live claims.

---

## 0:30 - 1:15 | Farmer Experience & Crop Analysis
2. **Switch to Farmer Ramesh:**
   - Click **Try Farmer Experience** (`/farmer/dashboard`).
   - Show greeting: *"Good morning, Ramesh!"* with Tomato (Flowering Stage) in Channapatna.
   - Click **Analyze My Crop** (`/farmer/analyze`).
   - Click sample button: **"🍂 Tomato Leaf with Early Blight"**.
   - Click **Next: Crop Context** and click **Run Multi-Agent Analysis**.
   - Watch the animated agent orchestration:
     - Image quality validation (blur & brightness check)
     - Vision optical lesion extraction
     - OpenWeather precipitation check
     - FAO-56 Penman-Monteith crop water calculation
   - Step 4 displays the **Unified Advisory**:
     - Disease: *Early Blight (89% Confidence, Moderate Severity)*
     - Water: ***SKIP IRRIGATION*** (+8,400 L avoided due to 18.5 mm forecast rain)
     - Energy: ***6.1 kWh Saved*** (avoided 2.2 hours pump electricity)
     - Scientific Citations: *ICAR-IIHR Bulletin 44/2023*

---

## 1:15 - 1:50 | Multilingual Voice & What-If Simulator
3. **Voice Assistant Demo:**
   - Tap the central floating **Voice Button** (Mic).
   - Click chip: *"💧 Water advice for today"*.
   - Watch NLU detect `IRRIGATION_QUERY`, synthesize the answer, and play audio speech output in real-time.
4. **What-If Scenario Simulation (`/farmer/scenarios`):**
   - Show side-by-side comparison: Conventional routine vs AgriEdge AI-Optimized Plan.
   - Point to the interactive Recharts bar visualization showing water and energy differentials.

---

## 1:50 - 2:30 | Closing the Loop & FPO Regional Intelligence
5. **Report Field Outcome:**
   - On the advisory card, click **Report Outcome Feedback**.
   - Submit: *"Followed advice and skipped irrigation"*, Crop Condition: *"Improved"*, Comment: *"Rain arrived as predicted"*.
   - Outcome Agent computes an **efficacy score of 100%** and flags the sample into the agronomist verification pool.
6. **Switch to FPO Intelligence Dashboard (`/fpo/dashboard`):**
   - Click the Judge Mode switcher: **FPO Lead**.
   - Present the **Disease Hotspot Map**:
     - Explain privacy-preserving village clustering (Channapatna, Maddur, Harohalli centroids).
     - Show 7-day cumulative water savings: **3.84 Million Litres**.
     - Show 7-day power savings: **4,120 kWh**.

---

## 2:30 - 3:00 | System Health & Closing
7. **System Health (`/admin`):**
   - Show live agent telemetry table: execution latency (18ms Vision, 3.4ms ET-Triage, 2ms RAG).
   - Show API cost control: < $0.002 per advisory.
8. **Conclusion:**
   - *"Save Water. Save Energy. Grow Smarter. AgriEdge replaces physical sensors with intelligent software in the farmer's own language."*
