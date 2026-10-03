# 🌾 KisaanSaathi (కిసాన్‌సాథి / किसान साथी)
### *AI-Powered, Voice-First Agricultural Decision Platform & Incident Response Network*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6+-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20PostGIS-3ECF8E.svg?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Fireworks AI](https://img.shields.io/badge/Fireworks%20AI-GLM--5.3--Flash-FF6B6B.svg?style=flat)](https://fireworks.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 Table of Contents
1. [Executive Summary & Vision](#-executive-summary--vision)
2. [Target Users & Personas](#-target-users--personas)
3. [What We Are Solving](#-what-we-are-solving)
4. [Core Architectural Pillars & Key Features](#-core-architectural-pillars--key-features)
   - [Pillar 1: Plan My Crop (పంట ప్రణాళిక)](#pillar-1-plan-my-crop-పంట-ప్రణాళిక)
   - [Pillar 2: My Farm — Three-Pillar Decision Hub (నా పొలం)](#pillar-2-my-farm--three-pillar-decision-hub-నా-పొలం)
   - [Pillar 3: Hyperlocal Community & Outbreak Radar (కమ్యూనిటీ)](#pillar-3-hyperlocal-community--outbreak-radar-కమ్యూనిటీ)
   - [Multimodal Voice-First Complaint Assistant (సమస్య నివేదిక)](#multimodal-voice-first-complaint-assistant-సమస్య-నివేదిక)
   - [AEO Officer Incident Management & Broadcast Portal](#aeo-officer-incident-management--broadcast-portal)
5. [AI, Vision & Speech Intelligence Stack](#-ai-vision--speech-intelligence-stack)
6. [Technology Stack](#-technology-stack)
7. [Project Directory Structure](#-project-directory-structure)
8. [Database Schema & PostGIS Architecture](#-database-schema--postgis-architecture)
9. [Getting Started & Local Setup](#-getting-started--local-setup)
10. [API Documentation](#-api-documentation)
11. [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🌟 Executive Summary & Vision

**KisaanSaathi** is an end-to-end digital agriculture operating system designed for Indian smallholder farmers and Agricultural Extension Officers (AEOs). 

Traditional farm advisory systems are either text-heavy, static, or disconnected from the ground reality. **KisaanSaathi** transforms agricultural extension into a **conversational, multilingual, voice-first, and geographically grounded experience**. 

By uniting **real-time weather intelligence**, **crop growth lifecycle modelling**, **multimodal vision inspection**, **hyperlocal pest outbreak radar**, and **government AEO triage workflows**, KisaanSaathi empowers farmers to make precise daily decisions from seed sowing to harvest.

---

## 👥 Target Users & Personas

| User Persona | Profile & Needs | How KisaanSaathi Solves It |
|---|---|---|
| **Smallholder Farmer (రైతు / किसान)** | Multilingual (Telugu, Hindi, English), low-to-medium digital literacy, needs spoken advice in regional dialects without typing complex text. | Voice-first interactions in local language, 1-tap dynamic farm briefings, camera-based AI pest diagnosis, and instant voice Q&A. |
| **Agricultural Extension Officer (AEO)** | Government officer overseeing 10–20 villages, overwhelmed with manual phone calls, lacking spatial outbreak visualization. | GIS heatmap cluster radar, automated priority triage (HIGH/MED/LOW), one-click digital advisories, and village-wide broadcast alerts. |
| **Farming Community / Cluster** | Farmers in neighboring fields facing localized pest migrations (e.g., Pink Bollworm, Thrips, Stem Borer). | Hyperlocal signal radar, 1-tap "Me Too" (నాకూ ఇదే సమస్య ఉంది) confirmation, and early community warnings. |

---

## 🎯 What We Are Solving

1. **Information Asymmetry**: Farmers often apply the wrong fertilizers or excess pesticides due to lack of timely expert advice.
2. **Language & Literacy Barriers**: Complex agricultural portals require typing in English. KisaanSaathi provides native voice input and natural spoken audio playback (TTS).
3. **Delayed Pest & Disease Containment**: Isolated pest attacks spread rapidly across adjoining fields before officers are alerted. KisaanSaathi creates an automated spatial outbreak radar.
4. **Disconnected Farm Lifecycle**: Planning tools, daily farm monitoring, and issue reporting are usually separate apps. In KisaanSaathi, choosing a crop in *Plan My Crop* immediately activates and persists a live crop cycle in *My Farm*.

---

## 🏛️ Core Architectural Pillars & Key Features

```
                                  KISAANSAATHI PLATFORM
                                             │
      ┌──────────────────────────────┬───────┴───────────────────────┬──────────────────────────────┐
      │                              │                               │                              │
┌─────▼──────────┐            ┌──────▼────────┐               ┌──────▼────────┐              ┌──────▼────────┐
│  PLAN MY CROP  │            │    MY FARM    │               │   COMMUNITY   │              │ REPORT PROBLEM│
│ (Crop Planning)│            │(Decision Hub) │               │(Outbreak Radar│              │ (Voice + ASR) │
└────────────────┘            └───────────────┘               └───────────────┘              └───────────────┘
```

### Pillar 1: Plan My Crop (పంట ప్రణాళిక)
- **Soil & Farm Context Setup**: Input land area (acres/guntas), soil type (Red Soil, Black Cotton, Sandy Loam), irrigation source (Borewell, Drip, Canal), season (Kharif/Rabi/Zaid), and budget.
- **AI Suitability & ROI Calculator**: Evaluates crops against soil composition, weather trends, expected yield, market price forecasts, and total investment cost.
- **Persistent Farm Activation**: Clicking *"Continue with this crop"* does not simply show an estimate—it **creates a persistent crop cycle and active field** in the farmer's database record, immediately populating the *My Farm* decision hub.

---

### Pillar 2: My Farm — Three-Pillar Decision Hub (నా పొలం)
- **🎙️ Real-Time Voice Assistant Hero**:
  - Authoritative `MediaRecorder` audio capture with streaming chunks.
  - Speech transcription powered by AI4Bharat IndicConformer & Google STT.
  - Fireworks AI (GLM-5.3-Flash) conversational decision engine.
  - **Strict Agricultural Relevance Gating**: Off-topic queries (movies, politics, cricket) are politely deflected with:
    > *"దయచేసి మీ పంట, సాగు లేదా వ్యవసాయానికి సంబంధించిన ప్రశ్నలను మాత్రమే అడగండి."*
  - **Zero Persistent Data Storage**: Transient Q&A queries remain completely stateless in-memory for total privacy.
- **📅 Dynamic Today's Farm Briefing Card**:
  - Live Open-Meteo weather parameters (Temperature, Humidity, Rain Probability).
  - Crop Stage Tracking (e.g. *Germination & Vegetative*, *Flowering & Pegging*, *Pod Development*).
  - Irrigation Advisory based on live soil moisture and impending rainfall.
  - AEO Advisories and community signals active in the farmer's mandal.
  - 🔊 One-tap *"Listen in Telugu"* audio playback.
- **🌿 Crop Lifecycle Milestones**:
  - Real-time day counter (e.g. *Day 1*, *Day 30*).
  - Growth stage timeline, upcoming milestone countdowns, and approximate harvest window.
- **🧪 Smart Fertilizer & Irrigation Recommendations**:
  - N-P-K nutrient balancing and split dose timings.
  - Rain withholding warnings when rain probability exceeds 50%.
- **📊 Yield & Harvest Planner**:
  - Dynamic yield estimation calculated from temperature anomalies, soil health, and pest history.
  - Integrated state APMC market price feeds (Agmarknet).
- **🔔 Proactive Alert Engine**:
  - Real-time agricultural alerts with deduplication, priority tags, and read/action tracking.
- **📜 Farm Memory Activity Log**:
  - Chronological activity timeline (sowing, watering, fertilizing, spraying).

---

### Pillar 3: Hyperlocal Community & Outbreak Radar (కమ్యూనిటీ)
- **Hyperlocal Outbreak Radar**: Scans for pest and disease reports within a 5 km to 25 km geographic radius.
- **1-Tap "Me Too" Confirmation**: Neighboring farmers experiencing the same symptom can click *"నాకూ ఇదే సమస్య ఉంది"*, elevating signal confidence to `STRONG`.
- **Verified Community Feed**: High-resolution photo posts, crop filters, and AEO officer verified badges.

---

### Multimodal Voice-First Complaint Assistant (సమస్య నివేదిక)
- **3-Step Conversational Reporting**:
  1. **Voice Input**: Farmer speaks their complaint in native Telugu or Hindi.
  2. **AI Summary & Photo Guidance**: System extracts crop type, symptom, duration, and gives visual photo capture tips.
  3. **Dual-Layer Multimodal Photo Inspection**: YOLO11 ONNX and GLM-5.3-Flash inspect leaf photos against the voice description to prevent blurry or invalid uploads.
- **Automated Incident Creation**: Generates official incident reference ID (`RB-XXXX`), GPS coordinate mapping, and auto-assigns the case to the local mandal AEO.

---

### AEO Officer Incident Management & Broadcast Portal
- **GIS Incident Cluster Map**: Leaflet / MapLibre geospatial visualization of incidents grouped by crop and severity.
- **Triage & Diagnosis**: AEO reviews multimodal photos, voice audio, and AI diagnostic hints.
- **One-Click Advisory Broadcast**: Dispatch SMS/push advisories to all farmers within a mandal growing the affected crop.
- **Field Visit Scheduling & Resolution Sign-off**: Verify treatment effectiveness and close cases.

---

## 🧠 AI, Vision & Speech Intelligence Stack

```
                                  AI INTELLIGENCE SUITE
                                             │
      ┌──────────────────────────────┼──────────────────────────────┐
      │                              │                              │
┌─────▼──────────┐            ┌──────▼────────┐              ┌──────▼────────┐
│  FIREWORKS AI  │            │ DUAL-LAYER VL │              │ SPEECH ENGINE │
│(GLM-5.3-Flash) │            │ (YOLO11+GLM)  │              │(IndicConformer│
│ Decision Core  │            │Photo Diagnosis│              │  + Indic TTS) │
└────────────────┘            └───────────────┘              └───────────────┘
```

1. **Reasoning & Advisory Core**:
   - **Model**: Fireworks AI (`accounts/fireworks/models/glm-5p3-flash`).
   - **Role**: Multilingual understanding, crop stage context matching, and agricultural relevance gating.
2. **Multimodal Visual Inspection**:
   - **Model**: YOLO11 (`f4m1/plant-disease-detector-12`) + GLM-5.3-Flash.
   - **Role**: Plant pathology localization, visual disease classification, pest identification, and leaf damage severity estimation.
3. **Speech-to-Text (STT)**:
   - **Engine**: AI4Bharat IndicConformer (AI4Bharat ASR) + Google STT REST fallback.
   - **Supported Dialects**: Telugu (`te-IN`), Hindi (`hi-IN`), Tamil (`ta-IN`), Kannada (`kn-IN`), English (`en-IN`).
4. **Text-to-Speech (TTS)**:
   - **Engine**: WebSpeech API + Indic WaveNet TTS synthesis.

---

## 💻 Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router DOM v7
- **Styling**: Tailored Modern Vanilla CSS Design System (Glassmorphism, Dark/Light Themes, Accessible High-Contrast UI)
- **Icons**: Lucide React
- **Audio Capture**: Browser Web Audio API & `MediaRecorder`

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Server**: Uvicorn ASGI with async worker pooling
- **Validation**: Pydantic v2
- **External Integrations**: Open-Meteo Weather API, Fireworks AI REST, Agmarknet Mandi Prices

### Database & Spatial Engine
- **Database**: Supabase PostgreSQL
- **Geospatial**: PostGIS spatial indexing (`ST_DWithin`, `ST_Point`, Spatial Cluster Queries)
- **Object Storage**: Supabase Storage (Audio recordings & crop inspection evidence photos)

---

## 📂 Project Directory Structure

```text
kisaansathi_clone/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── farm_platform.py        # Farm context, Voice Q&A, activities, alerts, yield
│   │   │       ├── incidents.py            # Incident submission, triage & resolution
│   │   │       ├── aeo_workflow.py         # AEO portal, advisories & broadcasts
│   │   │       ├── community.py            # Hyperlocal signals, posts & "Me Too"
│   │   │       └── health.py               # Health checks
│   │   ├── core/
│   │   │   └── config.py                   # Environment & API key settings
│   │   ├── database/
│   │   │   └── session.py                  # Supabase client wrapper
│   │   ├── models/
│   │   │   └── farm_platform_models.py     # Pydantic schemas for farm platform
│   │   ├── services/
│   │   │   ├── ai_decision_engine_service.py # Fireworks AI voice Q&A engine
│   │   │   ├── crop_lifecycle_service.py   # Crop stages, milestones & harvest calculation
│   │   │   ├── weather_service.py          # Open-Meteo live forecast & rain probability
│   │   │   ├── stt_service.py              # IndicConformer & Google STT transcription
│   │   │   ├── tts_service.py              # Indic speech synthesis
│   │   │   ├── alert_engine_service.py     # Real-time farm alerts
│   │   │   ├── yield_harvest_service.py    # Yield estimation & harvest planning
│   │   │   ├── market_price_service.py     # APMC Mandi market price feeds
│   │   │   ├── incident_service.py         # Complaint pipeline & deduplication
│   │   │   ├── community_signal_service.py # Spatial pest signal aggregation
│   │   │   └── aeo_intelligence_service.py # AEO suggestions & cluster analytics
│   │   └── main.py                         # FastAPI application entry point
│   ├── tests/                              # Comprehensive backend test suite (200+ unit tests)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceAssistantHero.jsx      # Voice mic, live preview & advisory card
│   │   │   ├── FarmerAiAssistant.jsx       # 3-Step complaint filing wizard
│   │   │   ├── FarmerPillarHome.jsx        # 3 Pillars Navigation & dashboard
│   │   │   ├── YieldHarvestPlannerCard.jsx # Yield & APMC mandi price card
│   │   │   ├── CommunityModule.jsx         # Community radar & discussion feed
│   │   │   ├── EvidenceComparisonCard.jsx  # Before/After diagnosis card
│   │   │   └── IncidentClusterMap.jsx      # GIS officer heatmap
│   │   ├── context/
│   │   │   └── LanguageContext.jsx         # Multilingual context (Telugu/Hindi/English)
│   │   ├── pages/
│   │   │   ├── FarmDashboardPage.jsx       # /farm (My Farm Hub)
│   │   │   ├── PlanMyCropPage.jsx          # /plan (Plan My Crop Wizard)
│   │   │   ├── MyIssuesPage.jsx            # /my-issues (Complaint Journey Tracker)
│   │   │   ├── CommunityFeedPage.jsx       # /community (Community Radar)
│   │   │   └── AeoDashboard.jsx            # /aeo (Officer Management Portal)
│   │   ├── services/
│   │   │   └── api.js                      # Central frontend API client
│   │   ├── __tests__/                      # Vitest UI test suite (140+ unit tests)
│   │   ├── App.jsx                         # App routes & shell layout
│   │   ├── index.css                       # Design tokens & responsive styles
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── database/
│   ├── schema.sql                          # Core PostgreSQL schema
│   ├── seed.sql                            # Production seed data (farmers, farms, crops, advisories)
│   └── postgis_setup.sql                   # Spatial indexing & distance functions
└── README.md
```

---

## 🗄️ Database Schema & PostGIS Architecture

The database is built on PostgreSQL with PostGIS extensions on Supabase:

- `farmers`: Stores farmer profiles, contact numbers, primary language, village, mandal, district, and baseline GPS coordinates.
- `farms`: Land holdings, acreage, and default soil classifications.
- `fields`: Individual plot boundaries, irrigation type (Drip/Sprinkler/Flood), and specific geographic center points.
- `crop_cycles`: Tracks active crop, seed variety, sowing date, stated crop age, and stage progression.
- `incidents`: Problem reports containing farmer ID, audio recording URL, symptom description, PostGIS `geog` location point, severity score, status, and assigned AEO ID.
- `incident_photos`: Multi-photo evidence attachments with vision AI inspection metadata.
- `community_posts` & `community_confirmations`: Hyperlocal radar posts and "Me Too" confirmations.
- `aeo_advisories`: Officer broadcast advisories linked to crops, mandals, and target stages.
- `farm_activities`: Time-series activity logs (irrigation, fertilization, spraying).

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.11+)
- **Supabase Account** or local PostgreSQL instance with PostGIS

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API keys
cp .env.example .env
```

**Required `.env` Variables:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
FIREWORKS_API_KEY=your-fireworks-api-key
GOOGLE_API_KEY=your-google-api-key
```

**Start Backend Server:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API documentation is accessible at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
The web application is accessible at: [http://localhost:5173](http://localhost:5173)

---

## 📡 API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ai/voice-question` | **Voice-First Q&A**: Transcribes audio, checks agricultural relevance, and returns spoken crop advice (No storage). |
| `GET` | `/api/v1/farmer/context` | **Unified Context Engine**: Aggregates farmer, active field, crop stage, weather, and alerts. |
| `POST` | `/api/v1/crop-cycles/select` | **Plan to Farm**: Persists selected crop into a live field cycle. |
| `GET` | `/api/v1/ai/irrigation/recommendation` | **Smart Irrigation**: Computes watering duration and rain withholding alerts. |
| `GET` | `/api/v1/ai/fertilizer/recommendation` | **Nutrient Advisory**: Recommends N-P-K dosage and organic soil nutrients. |
| `GET` | `/api/v1/yield/estimate` | **Yield Prediction**: Predicts harvest yield and revenue based on APMC market prices. |
| `POST` | `/api/v1/incidents/submit` | **Multimodal Incident Submission**: Submits voice + photo complaint with GPS coordinates. |
| `GET` | `/api/v1/community/signals` | **Outbreak Radar**: Returns pest outbreak signals within geographic radius. |
| `POST` | `/api/v1/community/confirm` | **Me Too Confirmation**: Increments cluster signal confidence for neighboring farms. |
| `POST` | `/api/v1/aeo/advisory/broadcast` | **Officer Broadcast**: Sends advisory notification to all matching farmers. |

---

## 🧪 Testing & Quality Assurance

### Frontend Test Suite (Vitest)
```bash
cd frontend
npm test
```
- **23 Test Suites**, **143 Tests Passing** covering all UI components, Language Context, Voice Assistant Hero, Evidence Cards, and Officer Dashboards.

### Backend Test Suite (Unittest / Pytest)
```bash
cd backend
python -m unittest discover -s tests
```
- **200+ Unit & Integration Tests** covering Context Engine, PostGIS spatial queries, Fireworks AI prompting, Crop Lifecycle state machines, and AEO triage.

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
