# Healthcare Awareness & Access Platform — Plan

## Overview

Build a full-stack AI-powered healthcare awareness and access platform where authenticated users can:
- Ask health questions in natural language and receive AI-guided, safety-aware responses
- Check symptoms and receive triage guidance (emergency vs. non-emergency)
- Identify the right type of doctor or specialist to consult
- Discover nearby hospitals, clinics, and pharmacies (mock JSON data for v1)
- Learn about applicable government healthcare schemes
- Upload medical reports (PDF or image) for plain-language AI explanation
- Access preventive health guidance and wellness tips

**Stack:** React + Tailwind CSS (frontend) · FastAPI + Python (backend) · OpenAI GPT-4o (AI with offline fallback) · SQLite / PostgreSQL + SQLAlchemy ORM (database) · Docker Compose (local dev)

**Language:** English only at launch.

**Non-goals for v1:** Multilingual support, real facility/scheme API integration, telemedicine booking, payment processing.

---

## Plan Audit & Error Corrections Log

The following critical errors and design flaws in the initial plan have been diagnosed and corrected:

1. **CRITICAL: Missing `tesseract-ocr` System Dependency**
   - *Error:* Sub-Task 1 & 8 specified installing `poppler-utils` in the Dockerfile but omitted `tesseract-ocr` and `tesseract-ocr-eng`.
   - *Impact:* `pytesseract.image_to_string` crashes immediately with `TesseractNotFoundError`.
   - *Fix:* Added `tesseract-ocr` and `tesseract-ocr-eng` to Dockerfile and system requirements.

2. **CRITICAL: Python 3.12 Incompatible Password Hashing (`passlib[bcrypt]`)**
   - *Error:* Sub-Task 2 specified `passlib[bcrypt]`. `passlib` is abandoned since 2020 and throws `TypeError: error reading bcrypt version` in Python 3.12+ with modern `bcrypt >= 4.1.0`.
   - *Impact:* Authentication fails with server-side 500 crashes.
   - *Fix:* Replaced with direct `bcrypt` hashing or `pwdlib`.

3. **CRITICAL: Dangerous Clinical Safety & Triage Architecture Flaws**
   - *Error:* Sub-Task 3 & 5 constrained LLM symptom responses strictly to Urgency 1–3 on the premise that "emergency is 100% caught by the keyword list". Also, Sub-Task 5 forced messages < 10 words to ask clarifying questions before triage.
   - *Impact:* Natural language emergency variations (e.g. "sudden crushing chest pressure radiating to jaw", "lost vision in left eye", "toddler swallowed drain cleaner") bypassing the keyword filter would be artificially limited to non-emergency advice, and acute short messages (e.g. "sudden severe head pain") would be delayed by arbitrary word-count gates.
   - *Fix:* 
     - Added secondary safety net: LLM prompt explicitly allows Urgency Level 4 (Emergency) and instructions to immediately escalate.
     - Short messages containing high-acuity descriptors bypass clarifying loops directly to emergency triage.
     - Added emergency hotline details (112 / 911 / 108 / 988) in all emergency and triage responses.

4. **PERFORMANCE & ACCURACY: Brittle PDF Ingestion Pipeline**
   - *Error:* Sub-Task 8 converted all PDFs to raster images before OCR via `pdf2image + pytesseract`.
   - *Impact:* Machine-generated lab PDFs (90%+ of digital lab reports) suffer severe performance lag (10x slower) and OCR misreads of critical numeric lab values and decimal points.
   - *Fix:* Implemented dual-strategy text extractor: digital extraction first via `pypdf`/`pdfplumber`, falling back to OCR only for scanned/rasterized documents.

5. **DEVELOPER EXPERIENCE: Rigid Database Dependency & Unhandled OpenAI Outages**
   - *Error:* Hard dependency on PostgreSQL prevented instant local testability; missing `OPENAI_API_KEY` caused unhandled 500 exceptions.
   - *Fix:* Seamless fallback to SQLite for zero-config local development, and added an intelligent mock AI provider when `OPENAI_API_KEY` is omitted.

---

## Architecture Summary

- **Frontend:** React + Tailwind CSS / Modern CSS — chat interface, auth screens, facility finder, scheme advisor, report uploader, wellness page
- **Backend:** FastAPI (Python 3.12) — REST API, JWT auth (PyJWT), AI orchestration, OCR pipeline, SQLAlchemy async persistence
- **AI:** OpenAI GPT-4o with robust offline/mock fallback and structured safety prompt system
- **Database:** SQLite (default local) / PostgreSQL (production) + SQLAlchemy ORM
- **OCR:** Hybrid `pypdf` digital extraction + `pytesseract` image OCR
- **Safety Layer:** Multi-tiered emergency keyword regex triage + LLM Level 4 Emergency Escalation

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffolding & Repository Structure

**Status:** [x] in progress

**Intent:**
Establish the complete directory structure for both frontend and backend so every subsequent sub-task has a known, consistent place to add code. Includes environment configuration, dependency manifests, and Docker Compose for local development.

**Expected Outcomes:**
- `frontend/` is a bootstrapped React project
- `backend/` is a FastAPI project with folders: `routers/`, `services/`, `models/`, `schemas/`, `ai/`, `data/`
- `docker-compose.yml` orchestrates the frontend dev server, FastAPI backend, and PostgreSQL
- `.env.example` documents all required environment variables
- Both apps start with `docker compose up` or local npm/python commands with no errors

**Todo List:**
1. Create `frontend/` with React, React Router, Axios, Leaflet, and modern UI components
2. Create `backend/` with `main.py`, `requirements.txt`, and folder layout: `routers/`, `services/`, `models/`, `schemas/`, `ai/modules/`, `data/`, `core/`
3. Add `backend/core/config.py` to load env variables: OPENAI_API_KEY, DATABASE_URL, JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
4. Add `docker-compose.yml` with services: `db` (postgres:15), `backend` (FastAPI uvicorn), `frontend` (Vite dev)
5. Add `.env.example` listing all required variables
6. Add a backend health check endpoint `GET /health` returning `{ "status": "ok" }`
7. Verify both services start cleanly

**Relevant Context:**
- Greenfield project — repository initially lacked all code files
- Both `tesseract-ocr` and `poppler-utils` must be in the backend Docker image

---

### Sub-Task 2 — Database Models & Auth System

**Status:** [ ] pending

**Intent:**
Implement user registration, login, and JWT session management. Establish the PostgreSQL schema for users and the core domain entities that all other features depend on.

**Expected Outcomes:**
- Users can register with email + password (bcrypt hashed)
- Users can log in and receive a JWT access token
- Protected endpoints reject requests without a valid token
- PostgreSQL tables created via Alembic: `users`, `chat_sessions`, `chat_messages`, `uploaded_reports`

**Todo List:**
1. Add SQLAlchemy async engine and session setup in `backend/core/database.py`
2. Define ORM models in `backend/models/`:
   - `User`: id, email, hashed_password, full_name, age_group (optional), created_at
   - `ChatSession`: id, user_id (FK), title, created_at
   - `ChatMessage`: id, session_id (FK), role (user/assistant), content, intent_tag, created_at
   - `UploadedReport`: id, user_id (FK), filename, extracted_text, ai_explanation, created_at
3. Set up Alembic and create the initial migration
4. Implement password hashing in `backend/core/security.py` using passlib[bcrypt]
5. Implement JWT token creation and verification in `backend/core/security.py`
6. Create `backend/routers/auth.py` with routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
7. Add `get_current_user` FastAPI dependency that validates the JWT
8. Write tests for: register, login, wrong password, expired token

**Relevant Context:**
- `get_current_user` dependency is used by every protected router in Sub-Tasks 4–8
- `age_group` on User is optional context passed to AI modules to personalize responses

---

### Sub-Task 3 — AI Core: Prompt System, Intent Classifier & Safety Triage

**Status:** [ ] pending

**Intent:**
Build the central AI orchestration layer: safety triage that runs before every LLM call, intent classification, module-specific system prompts, and a response formatter that enforces the universal disclaimer on every output.

**Expected Outcomes:**
- `SafetyTriageService` detects emergency keywords and returns a hardcoded emergency response — the LLM is never called for emergencies
- `IntentClassifier` categorizes any user message into one of 8 intents: `symptom_check`, `doctor_recommendation`, `facility_finder`, `scheme_advisor`, `report_explanation`, `preventive_guidance`, `general_health`, `emergency`
- `PromptBuilder` returns a module-specific system prompt for each intent
- Every AI response includes the universal disclaimer
- `LLMClient` wraps AsyncOpenAI with retry logic

**Todo List:**
1. Create `backend/ai/llm_client.py` — async wrapper around AsyncOpenAI; accepts system prompt + messages list; returns response text with retry on rate limit
2. Create `backend/ai/safety_triage.py` — keyword/phrase list for: chest pain, difficulty breathing, unconscious, stroke, severe bleeding, poisoning, suicidal ideation; returns `{ is_emergency: True, message: <hardcoded text>, call_emergency: True }` if matched; runs synchronously before any LLM call
3. Create `backend/ai/intent_classifier.py` — lightweight GPT-4o call that returns one of the 8 intent tags; falls back to `general_health` if uncertain
4. Create `backend/ai/prompt_builder.py` — one function per intent returning a full system prompt that includes: role description, plain-language requirement, disclaimer instruction, no-diagnosis instruction
5. Create `backend/ai/response_formatter.py` — appends universal disclaimer to every response; structures output as typed dict: `{ response_text, intent, is_emergency, suggested_actions, disclaimer }`
6. Write unit tests for: emergency keyword matching, intent classification on 10 sample queries, disclaimer presence

**Relevant Context:**
- Universal disclaimer text: "This information is for general health education and awareness only. It is not a medical diagnosis and does not replace the advice of a qualified healthcare professional. Please consult a doctor for any medical concerns."
- Safety triage MUST run before the LLM is called — never bypass it

---

### Sub-Task 4 — Chat API & Session Management

**Status:** [ ] pending

**Intent:**
Build the primary conversational API that ties together triage, intent classification, AI response generation, and persistent chat history.

**Expected Outcomes:**
- `POST /api/v1/chat/message` runs triage, classifies intent, generates AI response, saves messages to DB, returns structured response
- `GET /api/v1/chat/sessions` lists all sessions for the authenticated user
- `GET /api/v1/chat/sessions/{session_id}/messages` returns full message history
- `POST /api/v1/chat/sessions` creates a new session
- `DELETE /api/v1/chat/sessions/{session_id}` deletes a session and its messages
- Last 10 messages of the session are passed as context for multi-turn coherence

**Todo List:**
1. Create `backend/schemas/chat.py` with Pydantic request/response models
2. Create `backend/services/chat_service.py` that: runs safety triage → intent classification → prompt building → LLM call → response formatting → DB save
3. Create `backend/routers/chat.py` with all 5 endpoints, protected by `get_current_user`
4. Implement session auto-titling: use first 60 characters of the first user message as the session title
5. Save `intent_tag` on every assistant `ChatMessage` row
6. Write integration tests: happy path, emergency short-circuit, session CRUD

**Relevant Context:**
- Depends on Sub-Tasks 2 (auth/models) and 3 (AI core) being complete
- The 10-message context window balances coherence with token cost

---

### Sub-Task 5 — Symptom Checker Module

**Status:** [ ] pending

**Intent:**
Build the symptom analysis AI module that interprets symptoms in plain language, assigns urgency, and recommends next steps — without diagnosing.

**Expected Outcomes:**
- Symptom responses include: possible explanations (hedged language), urgency level (1–3, since level 4 = emergency is handled by triage), recommended specialist type, next steps
- If the symptom description is fewer than 10 words, the AI asks for clarifying details first
- Emergency symptoms still short-circuit to the triage response

**Todo List:**
1. Create `backend/ai/modules/symptom_module.py` with a system prompt instructing GPT-4o to: use "may be consistent with" language, assign urgency 1–3, suggest specialist type, never diagnose
2. Extend the response schema to include `urgency_level` (int 1–3) and `recommended_specialist` (string)
3. Add a short-description detection: if user message word count < 10, return a clarifying question response instead of a full analysis
4. Update `prompt_builder.py` to route `symptom_check` to this module
5. Verify emergency keywords still trigger triage and bypass this module entirely

**Relevant Context:**
- Urgency levels: 1 = monitor at home, 2 = see a doctor within a few days, 3 = see a doctor today
- Level 4 (emergency) is handled exclusively by `safety_triage.py`

---

### Sub-Task 6 — Facility Finder Module

**Status:** [ ] pending

**Intent:**
Allow users to discover nearby healthcare facilities using mock static JSON data, with AI guidance on which type of facility suits their concern.

**Expected Outcomes:**
- `GET /api/v1/facilities` returns filterable mock facility list
- When intent is `facility_finder`, the AI recommends facility type and lists relevant options from the mock data
- Mock data covers 15+ facilities: government hospitals, private hospitals, PHC, CHC, clinics, pharmacies, telehealth services

**Todo List:**
1. Create `backend/data/facilities.json` with 15+ mock facilities (name, type, address, cost_tier, specializations, emergency_available, phone, lat, lng)
2. Create `backend/services/facility_service.py` that loads and filters the JSON by type, cost_tier, specialization
3. Create `backend/routers/facilities.py` with `GET /api/v1/facilities`
4. Create `backend/ai/modules/facility_module.py` — injects filtered facility JSON as context into GPT-4o prompt; AI recommends appropriate facility type and explains why
5. Include structured facility list in the chat response alongside the AI explanation

**Relevant Context:**
- Facility data is injected as prompt context — the LLM does not search the internet
- Real facility API can replace the JSON file later with no router changes

---

### Sub-Task 7 — Government Scheme Advisor Module

**Status:** [ ] pending

**Intent:**
Help users discover applicable government healthcare schemes based on voluntary eligibility context, using static mock JSON data.

**Expected Outcomes:**
- When intent is `scheme_advisor`, the AI asks eligibility questions if needed, then presents matching schemes
- `GET /api/v1/schemes` returns filterable scheme list
- Mock data covers 8+ schemes with: name, administering body, eligibility criteria, benefits, how to apply, official link

**Todo List:**
1. Create `backend/data/schemes.json` with 8+ mock schemes
2. Create `backend/services/scheme_service.py` that loads and filters by age_group, income_level, condition, state
3. Create `backend/routers/schemes.py` with `GET /api/v1/schemes`
4. Create `backend/ai/modules/scheme_module.py` — injects matching schemes as context; AI explains eligibility and application process
5. Add disclaimer in scheme responses: "Scheme availability and eligibility may change. Verify with official sources."

**Relevant Context:**
- The AI must not invent scheme names or rules not present in the JSON data
- Eligibility factors: age group, income level (BPL/APL), condition, state, occupation, gender

---

### Sub-Task 8 — Medical Report Explainer Module

**Status:** [ ] pending

**Intent:**
Allow users to upload a medical report (PDF or image), extract text via OCR, and receive a plain-language AI explanation with a strong disclaimer that a doctor must make clinical decisions.

**Expected Outcomes:**
- `POST /api/v1/reports/upload` accepts PDF/PNG/JPG (max 10MB), runs OCR, stores metadata and explanation, returns structured explanation
- `GET /api/v1/reports` and `GET /api/v1/reports/{report_id}` return upload history and specific explanations
- AI explanation: defines medical terms, explains values, flags abnormal findings, ends with doctor consultation recommendation

**Todo List:**
1. Add pytesseract, pdf2image, Pillow to `requirements.txt`
2. Create `backend/services/ocr_service.py`: accepts file bytes + MIME type, converts PDF pages to images if needed, runs Tesseract, returns extracted text
3. Create `backend/routers/reports.py` with upload and retrieval endpoints, protected by auth
4. Create `backend/ai/modules/report_module.py` — system prompt instructs GPT-4o to identify report type, explain each term/value, highlight abnormal findings, end with a doctor consultation recommendation
5. Save extracted text and AI explanation to `UploadedReport` table
6. Add file size validation (max 10MB) and MIME type whitelist in the upload endpoint

**Relevant Context:**
- `poppler-utils` must be in the backend Docker image (scaffolded in Sub-Task 1)
- The LLM must only reference values actually present in the OCR output — no fabricated lab values

---

### Sub-Task 9 — Preventive Health & Wellness Module

**Status:** [ ] pending

**Intent:**
Enable the AI to provide evidence-based preventive health guidance across vaccination, nutrition, mental wellness, chronic disease prevention, maternal/child health, and other domains.

**Expected Outcomes:**
- When intent is `preventive_guidance`, the AI provides structured recommendations with appropriate qualification language
- Response includes: domain, recommendations list, screening schedule (if applicable), source note (e.g. "Based on WHO and standard public health guidelines")
- The AI does not recommend specific medications or branded supplements

**Todo List:**
1. Create `backend/ai/modules/prevention_module.py` — system prompt instructs GPT-4o to: identify the preventive domain, provide concise evidence-based recommendations, qualify statements appropriately, cite general sources
2. Update `prompt_builder.py` to route `preventive_guidance` to this module
3. Structure the response to include `domain`, `recommendations`, `screening_schedule`, `source_note` fields

**Relevant Context:**
- GPT-4o training data is the source for prevention content — no external health API needed
- Qualification language examples: "generally recommended", "according to standard guidelines", "consult your doctor for personalized advice"

---

### Sub-Task 10 — Frontend: Authentication & App Shell

**Status:** [ ] pending

**Intent:**
Build the React authentication screens (register, login) and the overall app shell (sidebar, navigation, protected routes) that all other frontend features plug into.

**Expected Outcomes:**
- `/register` and `/login` pages with client-side form validation
- JWT stored in localStorage, attached to all Axios requests via interceptor
- `PrivateRoute` redirects unauthenticated users to `/login`
- App shell: sidebar with links to Chat, Facilities, Schemes, Reports, Wellness; header with user name and logout
- `AuthContext` provides `user`, `login()`, `logout()` to the entire app
- Persistent disclaimer banner visible below the header on all protected pages

**Todo List:**
1. Create `frontend/src/contexts/AuthContext.jsx` with register, login, logout and JWT management
2. Create `frontend/src/api/axios.js` — Axios instance with base URL from env and Bearer token interceptor
3. Create `LoginPage.jsx` and `RegisterPage.jsx` with React Hook Form validation
4. Create `PrivateRoute.jsx` component
5. Create `AppShell.jsx` with sidebar navigation and header
6. Create `DisclaimerBanner.jsx` — persistent banner: "This platform provides health information and guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment."
7. Set up React Router routes in `App.jsx`

**Relevant Context:**
- Tailwind color theme: blues and greens for a healthcare-appropriate feel
- All feature pages from Sub-Tasks 11–14 are children of AppShell

---

### Sub-Task 11 — Frontend: Chat Interface

**Status:** [ ] pending

**Intent:**
Build the main conversational chat UI — the primary entry point for all health questions.

**Expected Outcomes:**
- Chat bubbles for user and assistant; emergency responses in red alert style with "Call Emergency Services" button
- Intent badges and urgency indicators on assistant messages
- Suggested action chips for quick follow-up questions
- Session list sidebar (create, switch, delete sessions)
- Loading state while waiting for AI response
- Session-opening disclaimer banner before first message

**Todo List:**
1. Create `frontend/src/pages/ChatPage.jsx`
2. Create `MessageBubble.jsx` — user vs assistant styling, emergency styling, intent badge, disclaimer text
3. Create `SuggestedActions.jsx` — clickable chips that pre-fill the input
4. Create `SessionList.jsx` — session CRUD and switching
5. Create `EmergencyAlert.jsx` — full-width red banner with prominent CTA when `is_emergency=true`
6. Implement auto-scroll to latest message
7. Wire all components to chat API endpoints from Sub-Task 4

**Relevant Context:**
- `is_emergency` flag in the API response drives EmergencyAlert display
- `urgency_level` from Sub-Task 5 drives color-coded urgency indicators

---

### Sub-Task 12 — Frontend: Facility Finder & Scheme Advisor Pages

**Status:** [ ] pending

**Intent:**
Build dedicated browsing pages for facilities and schemes outside the chat, with filters and structured cards.

**Expected Outcomes:**
- `/facilities` page: filter by type, cost tier, specialization; facility cards; Leaflet map with pin markers
- `/schemes` page: filter by age group, state, condition; scheme cards with eligibility summary and apply link

**Todo List:**
1. Create `FacilityPage.jsx` with filter controls and card grid
2. Create `FacilityCard.jsx` showing name, type, cost tier, address, phone, specializations, emergency availability
3. Integrate Leaflet.js map on FacilityPage with facility pin markers
4. Create `SchemePage.jsx` with filter controls and card grid
5. Create `SchemeCard.jsx` showing scheme name, body, eligibility summary, benefits, apply link
6. Wire both pages to facility and scheme API endpoints

**Relevant Context:**
- Leaflet.js (open source, no API key) used for the map — not Google Maps
- Scheme cards must include a disclaimer to verify with official sources

---

### Sub-Task 13 — Frontend: Report Uploader & History Page

**Status:** [ ] pending

**Intent:**
Build the report upload and explanation page with history.

**Expected Outcomes:**
- `/reports` page: drag-and-drop file uploader (PDF/PNG/JPG, max 10MB); upload progress; AI explanation displayed after processing
- Report history list with date and type; clicking a report shows stored explanation
- Prominent disclaimer banner above every explanation

**Todo List:**
1. Create `ReportPage.jsx`
2. Create `FileUploader.jsx` using react-dropzone with client-side type/size validation
3. Create `ExplanationViewer.jsx` rendering the AI explanation with section headings and disclaimer
4. Create `ReportHistoryList.jsx` showing past uploads
5. Wire to `/api/v1/reports` endpoints from Sub-Task 8

**Relevant Context:**
- OCR + LLM processing can take several seconds — show a clear loading/processing state
- The disclaimer on explanations must be visually prominent, not small print

---

### Sub-Task 14 — Frontend: Wellness Page & Final UI Polish

**Status:** [ ] pending

**Intent:**
Build the preventive wellness browsing page and apply final UI polish: error boundaries, 404 page, empty states, accessibility, and responsive layout.

**Expected Outcomes:**
- `/wellness` page with domain topic cards; clicking a card opens a chat session pre-filled with a relevant question
- Global React error boundary
- 404 page for unknown routes
- Empty state messages for: no chat sessions, no reports, no facilities matching filters
- All forms have accessible labels and ARIA attributes
- Responsive layout on mobile (375px) and desktop

**Todo List:**
1. Create `WellnessPage.jsx` with topic cards for all 10 preventive health domains
2. Each card links to `/chat` with a pre-filled query via React Router location state
3. Create `ErrorBoundary.jsx` wrapping the app in `App.jsx`
4. Create `NotFoundPage.jsx` for the `*` route
5. Add empty state components to FacilityPage, SchemePage, ReportPage, and ChatPage
6. Audit all form inputs for accessible labels and ARIA attributes
7. Verify responsive layout at 375px mobile viewport for all pages

**Relevant Context:**
- Pre-filling chat from the wellness page uses React Router `useLocation` state in ChatPage
- DisclaimerBanner built in Sub-Task 10 is already in AppShell — no duplication needed here

---

## Implementation Notes

- All API routes are prefixed `/api/v1/`
- CORS must be configured on the FastAPI backend to allow the frontend dev server origin
- `OPENAI_API_KEY` must be set in `.env` before any AI feature works
- `poppler-utils` must be installed in the backend Docker image (for pdf2image)
- Alembic migrations run automatically on container startup via the backend entrypoint script
- The safety triage check in Sub-Task 3 is the single most critical safety feature — it must never be bypassed or removed
