# AgriEdge Production Deployment Guide (Render + Vercel)

AgriEdge is architected for modern decoupled deployment:
- **Backend API & AI Engine**: [Render](https://render.com) (Python FastAPI Web Service)
- **Frontend PWA / Dashboard**: [Vercel](https://vercel.com) (Vite + React Single-Page Application)
- **Managed Database**: [Neon](https://neon.tech) Serverless PostgreSQL (or Render PostgreSQL)

---

## 🚀 Step 1: Deploy Backend to Render

### Method A: 1-Click Blueprint (Recommended)
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository: `https://github.com/Sayandevxyz/AgriEdge`.
4. Render will automatically detect the [`render.yaml`](../render.yaml) file at repository root.
5. In the environment variables prompt, fill in:
   - `DATABASE_URL`: Your PostgreSQL connection string (e.g. from Neon: `postgresql://user:password@ep-...neon.tech/neondb?sslmode=require`).
   - `OPENROUTER_API_KEY`: Your OpenRouter API key (for Qwen VL vision models & LLMs).
   - `OPENAI_API_KEY`: (Optional fallback).
   - `WEATHER_API_KEY`: OpenWeatherMap API key (optional, high-accuracy fallback included).
   - `MARKET_API_KEY`: AlphaVantage / Agmarknet key (optional).
6. Click **Apply**. Render will install dependencies and start the Uvicorn web server.
7. Once deployed, note down your Render Web Service URL:
   `https://agriedge-api.onrender.com` (or your custom service name).

### Method B: Manual Web Service Setup
If creating the service manually:
- **Service Type**: Web Service
- **Environment**: Python 3
- **Branch**: `main`
- **Root Directory**: `.` (leave empty or set to root)
- **Build Command**: `pip install -r apps/api/requirements.txt`
- **Start Command**: `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/health`
- **Environment Variables**:
  ```env
  APP_MODE=production
  PYTHON_VERSION=3.11.9
  DATABASE_URL=postgresql://...
  JWT_SECRET=super_secret_64_char_key
  JWT_REFRESH_SECRET=super_refresh_64_char_key
  CORS_ORIGINS=https://agriedge.vercel.app,http://localhost:5173
  OPENROUTER_API_KEY=sk-or-v1-...
  ```

---

## ⚡ Step 2: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository: `Sayandevxyz/AgriEdge`.
4. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `apps/web` (Click *Edit* and select `apps/web`)
   - **Build Command**: `npm run build` (Default)
   - **Output Directory**: `dist` (Default)
5. Under **Environment Variables**, add:
   - **Key**: `VITE_API_URL`
   - **Value**: Your Render backend URL from Step 1 (e.g. `https://agriedge-api.onrender.com` without trailing slash).
6. Click **Deploy**.
7. Vercel will build the SPA bundle and deploy to a URL like `https://agriedge.vercel.app`.

*(Note: [`vercel.json`](../apps/web/vercel.json) is pre-configured with SPA route rewrites to ensure direct URL navigation like `/farmer`, `/fpo`, and `/admin` does not throw 404 errors).*

---

## 🔗 Step 3: Verify Full-Stack Integration

1. Visit your Vercel URL in your browser (e.g. `https://agriedge.vercel.app`).
2. Test Demo Login:
   - Click **Demo Farmer** -> Inspect dashboard for real-time ET0, weather cards, and irrigation triage.
3. Test Leaf Vision:
   - Navigate to **Crop Diagnosis** (`/farmer/crop-analysis`).
   - Click **`🌽 Maize Field (Northern Blight)`** sample leaf.
   - Click **Analyze Leaf Lesions** -> Verify multi-agent pathology analysis returns Northern Corn Leaf Blight diagnosis and water recommendations.
4. Verify Health Endpoint:
   - In browser or terminal: `curl https://your-render-url.onrender.com/health`
   - Returns: `{"status":"HEALTHY","timestamp":...}`

---

## 🐳 Option 3: All-in-One Docker Deployment (VPS / Self-Hosted)

For dedicated servers or single VPS (DigitalOcean / Linode / AWS EC2):
```bash
# 1. Clone repository
git clone https://github.com/Sayandevxyz/AgriEdge.git
cd AgriEdge

# 2. Configure environment
cp .env.example .env
nano .env

# 3. Build & start
docker compose up -d --build

# 4. Access apps
# Frontend: http://localhost:80
# API docs: http://localhost:8000/docs
```
