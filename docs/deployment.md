# AgriEdge Production Deployment Guide

AgriEdge is containerized and cloud-ready for standard cloud infrastructure (Vercel, Render, Railway, AWS ECS, Google Cloud Run).

---

## Option 1: Docker Compose (All-in-One VPS / Dedicated Host)

To run the complete production stack (Postgres + Redis + FastAPI Backend + Vite Nginx Frontend):

```bash
# 1. Clone repository and configure environment variables
cp .env.example .env
nano .env

# 2. Build and start containers in detached mode
docker compose up -d --build

# 3. Verify services health
docker compose ps
curl http://localhost:8000/health
```

---

## Option 2: Split Production Architecture

### Frontend (Vercel / Netlify / Cloudflare Pages)
- **Framework Preset:** Vite
- **Root Directory:** `apps/web`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_BASE_URL`: `https://api.yourdomain.com`

### Backend (Render / Railway / Cloud Run)
- **Root Directory:** `.` or `apps/api`
- **Build Command:** `pip install -r apps/api/requirements.txt`
- **Start Command:** `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:**
  - `APP_MODE`: `production`
  - `DATABASE_URL`: `postgresql://user:password@neon.tech/agriedge?sslmode=require`
  - `REDIS_URL`: `rediss://default:password@upstash.io:6379`
  - `JWT_SECRET`: High-entropy 64-character secret
  - `JWT_REFRESH_SECRET`: High-entropy 64-character secret
  - `CORS_ORIGINS`: `https://app.yourdomain.com`

---

## Option 3: Local Development (Fast Startup)

```bash
# 1. Start FastAPI backend (Port 8000)
.\.venv\Scripts\uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Start Vite frontend (Port 5173)
npm --prefix apps/web run dev

# 3. Open browser
http://localhost:5173/
```
Zero configuration required: SQLite database auto-seeds baseline farmer and FPO records immediately.
