# EcoTwin AI — Campus Waste & Sustainability Intelligence System
**Code Craft Hackathon 2026**

EcoTwin AI is a campus-scale digital twin and waste management platform that pairs real-time camera computer vision with an autonomous AI operations agent, interactive spatial campus maps, incident analytics, and Supabase cloud persistence.

---

## 🌟 Key Features

1. **AI-Powered Live Camera Console (FastAPI + OpenCV)**
   - Live camera teach-and-remember waste detection using feature matching & descriptors.
   - Real-time video streaming (`/video_feed`), multi-shot reference image capture, and bounding-box tracking.
   - Automatic incident logging and image evidence dispatch to Supabase Database & Storage.

2. **Next.js 15 Web Application & Digital Twin Dashboard**
   - **Interactive 2D Campus Map**: Live spatial heatmaps, building status badges, and zoom/pan camera locations.
   - **Live Incident Monitoring**: Real-time event feed with thumbnail evidence preview, severity tags, and inspector drawers.
   - **EcoPilot AI Agent**: Autonomous multi-turn AI reasoning assistant for campus sustainability audits and follow-up work orders.
   - **Deep Analytics**: Trend charts, inspection histories, compliance scores, and downloadable sustainability audit reports.

3. **Supabase Cloud Backend**
   - Relational schemas for logical cameras, buildings, inspections, camera events, alerts, and recommendations.
   - Automated cloud storage buckets for high-resolution visual evidence (`camera-evidence`).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- Python (v3.10+ recommended)
- Supabase account with configured schema

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and supply your Supabase and application keys:
```bash
cp .env.example .env.local
```

### 3. Start Next.js Web Application
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Start Python Camera Intelligence Service
```bash
python run_camera_admin.py
```
Or start FastAPI directly:
```bash
uvicorn camera_service.main:app --host 127.0.0.1 --port 8000
```
Open [http://localhost:8000](http://localhost:8000) for the live camera management console.

---

## 📂 Repository Structure

```
├── camera_service/         # FastAPI camera console & computer vision engine
│   ├── main.py             # FastAPI entrypoint, streaming, and event uploaders
│   ├── visual_memory.py    # Visual feature memory & template management
│   ├── model_adapter.py    # Detection & matching adapter
│   └── tracker.py          # Temporal bounding box tracker
├── model_training/         # YOLO / ML annotation guides, scripts & tools
├── public/                 # Static assets & public images
├── src/
│   ├── app/                # Next.js App Router (pages & API routes)
│   ├── components/         # Reusable UI views, layouts, and components
│   └── lib/                # Supabase client & API utilities
├── supabase/               # SQL migrations and database schema
└── run_camera_admin.py     # Camera service launcher
```

---

## 👥 Authors & Acknowledgments
Built for the **Code Craft Hackathon** by **Jeevan Naik** ([@Jeevan-tech15](https://github.com/Jeevan-tech15)).
