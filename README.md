# CarePulse — AI Healthcare Awareness & Access Platform

An enterprise-ready, safety-first full-stack healthcare awareness and access platform. CarePulse empowers individuals with natural language AI health guidance, deterministic emergency triage, verified facility discovery, government welfare scheme recommendations, automated plain-language medical report translation, and evidence-based preventive health education.

---

## 🛠️ Errors Diagnosed & Corrected in this Repository

Prior to this update, this repository contained only a blank README and an unstarted planning specification (`healthcare-platform-plan.md`) with critical architectural, security, and medical safety flaws. The following issues were diagnosed and corrected:

| Error Category | Issue in Original Repository / Plan | Correction Implemented |
| :--- | :--- | :--- |
| **Missing Implementation** | The repository had 0 lines of code; all 14 sub-tasks were pending with no runnable services or files. | Implemented the complete, working full-stack platform across backend (FastAPI), frontend (React), and database services. |
| **System Dependency Crash** | Sub-Tasks 1 & 8 specified installing `poppler-utils` in Docker, but **omitted `tesseract-ocr` and `tesseract-ocr-eng`**, which would cause `pytesseract.TesseractNotFoundError` on runtime report uploads. | Updated `Dockerfile` and setup instructions to install both `tesseract-ocr` and `poppler-utils`. |
| **Security & Library Deprecation** | Specified `passlib[bcrypt]`, which is abandoned since 2020 and throws `TypeError: error reading bcrypt version` in Python 3.12+ with modern `bcrypt >= 4.1.0`. | Replaced with direct `bcrypt` password hashing and secure `PyJWT` tokens. |
| **Clinical Safety & Triage Hazard** | 1. Artificially constrained LLM symptom responses to Urgency Levels 1–3, assuming keyword matching caught 100% of emergencies.<br>2. Blocked queries < 10 words from emergency triage. | 1. Upgraded Safety Triage to a multi-tiered safety system: regex/fuzzy emergency keywords + immediate escalation path.<br>2. Allowed LLM to output Urgency Level 4 (Emergency) as a secondary safety net.<br>3. Urgent descriptions bypass word-count gates immediately to triage.<br>4. Integrated clickable emergency hotlines (112, 911, 14416). |
| **Inefficient PDF Processing** | Forced rasterization of all digital lab PDFs to images before OCR, causing 10x slower processing and OCR misreading of numeric decimals. | Implemented dual-strategy text extractor: direct digital text extraction (`pypdf`) with graceful OCR fallback for scanned reports. |
| **Dev Environment Rigidity** | Rigid PostgreSQL dependency prevented instant local testing. | Added flexible database engine supporting SQLite (`aiosqlite`) for zero-config local run, with PostgreSQL (`asyncpg`) for production. |
| **Missing AI Fallback** | Lack of an OpenAI API key would crash the entire platform with unhandled 500 errors. | Built a resilient Clinical AI client with intelligent mock fallback responses, enabling full offline functionality and automated test execution. |

---

## 🏗️ Architecture & Technology Stack

- **Backend:** FastAPI (Python 3.12)
  - RESTful architecture with `/api/v1` prefix
  - SQLAlchemy 2.0 (Async Engine) with SQLite / PostgreSQL support
  - Deterministic safety triage regex engine
  - OpenAI GPT-4o client with intelligent clinical fallback generator
  - Dual PDF & image OCR ingestion engine (`pypdf` + `pytesseract`)
- **Frontend:** React + Vite
  - Vanilla CSS design system with custom medical color tokens and glassmorphism
  - Interactive multi-turn chat with emergency alert states
  - Filterable directory for facilities and government healthcare schemes
  - Drag-and-drop diagnostic report explainer with sample report loader
  - 10 evidence-based preventive health topic modules
- **Database:** SQLite (default local) / PostgreSQL 15 (Docker)
- **Containerization:** Docker Compose for multi-container orchestration

---

## 🚀 Quickstart Guide

### Option 1: Run Locally (Recommended for Fast Testing)

#### 1. Start the FastAPI Backend
```bash
# In the repository root
pip install -r backend/requirements.txt

# Run the backend server (starts on http://localhost:8000)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

#### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
- Open your browser at: [http://localhost:5173](http://localhost:5173)

---

### Option 2: Run with Docker Compose

Ensure Docker Desktop is running, then run:
```bash
docker compose up --build
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)

---

## 🧪 Running Automated Tests

Run the full backend test suite covering safety triage, authentication, API endpoints, and chat orchestration:

```bash
python -m pytest backend/tests -v
```

All 12 unit and integration tests pass cleanly.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint |
| `POST` | `/api/v1/auth/register` | Register user and receive JWT |
| `POST` | `/api/v1/auth/login` | Authenticate user and receive JWT |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/v1/chat/message` | Send message to AI triage & reasoning pipeline |
| `GET` | `/api/v1/chat/sessions` | List consultation sessions for user |
| `POST` | `/api/v1/chat/sessions` | Create a new consultation session |
| `GET` | `/api/v1/facilities` | Filter healthcare facilities by type, cost, emergency |
| `GET` | `/api/v1/schemes` | Filter government welfare schemes by demographic |
| `POST` | `/api/v1/reports/upload` | Upload PDF/image report for OCR and AI translation |
| `GET` | `/api/v1/wellness/topics` | Retrieve 10 evidence-based preventive health topics |

---

## 🛡️ Medical Disclaimer & Safety Protocol

CarePulse is engineered with patient safety as the foundational priority:
1. **Pre-LLM Emergency Triage:** Queries containing critical emergency markers (e.g. crushing chest pain, slurred speech, active convulsions, severe anaphylaxis, or acute distress) immediately short-circuit to a deterministic red alert with emergency dial-in buttons for **112 / 911 / 14416 (Tele-MANAS)**.
2. **Hedged Language:** All non-emergency AI recommendations use non-definitive, hedged language (*"These symptoms may be consistent with..."*) and strictly mandate physician evaluation.
3. **No Direct Drug Prescriptions:** The system never prescribes specific dosages of prescription drugs.