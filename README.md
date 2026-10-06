# Parakh AI

Parakh AI is a local-first Node.js/Express and React application for AI-assisted Legal Metrology compliance checking of packaged commodities, combining OCR-based label reading, a deterministic legal rule engine, MongoDB-backed inspection history, and PDF report generation.

## 1. Project Title and One-Line Description

Parakh AI is an AI-assisted compliance checker that scans a packaged-product label, reads it with OCR, validates it against the Legal Metrology (Packaged Commodities) Rules, 2011, and returns an evidence-backed, scored compliance verdict.

## 2. Overview

Parakh AI answers a single practical question — "does this product label meet its mandatory legal declarations?" — by combining computer-read text with a deterministic rule engine, rather than asking a language model to judge compliance directly.

The system is split into three independent runtime processes. A Python/FastAPI service (`ocr-service/main.py`) wraps EasyOCR and exposes one endpoint, `POST /extract-text`, which returns detected text lines with confidence scores and bounding boxes for an uploaded image. A Node.js/Express backend (`backend/server.js`) receives the original upload from the browser, forwards it to the OCR service, runs the result through `backend/services/complianceChecker.js`, persists the outcome in MongoDB, and can generate a PDF report with `backend/services/reportGenerator.js` (built on `pdfkit`). A React/Vite frontend (`frontend/src`) provides the upload UI, results view, history, violations list, and authentication screens.

**Two parallel inspection APIs currently coexist.** The original, simpler flow (`backend/routes/inspect.js`, mounted at `/api/inspect`, `/api/history`, `/api/dashboard`, `/api/violations`) accepts one image per request and is what the `/check` page in the frontend actually uses today. A newer, more complete multi-image flow (`backend/routes/inspections.js`, mounted at `/api/inspections`) supports uploading several labeled photos per inspection, a multi-stage processing pipeline (`CREATED → UPLOADING → PROCESSING → OCR_PROCESSING → EXTRACTING → VALIDATING → COMPLETED`), and structured field extraction via `backend/services/declarationExtractor.js`. Its frontend pages (`NewInspectionPage.jsx`, `DashboardPage.jsx`, `InspectionDetailPage.jsx`, `AdminPage.jsx`) exist in the codebase but are **not currently linked from the navigation bar**, pending further debugging (see Known Limitations).

**Rule engine scope.** The active rule set is not hardcoded in application logic — it is stored as a versioned document in the `RuleSet` MongoDB collection (seeded by `backend/scripts/seedRuleSet.js` from `backend/config/rules.json`) and fetched at request time. This allows a new Legal Metrology amendment to be added as a new rule-set version without changing code, and keeps prior versions queryable for historical inspections.

## 3. System Architecture

Three independently-runnable services communicate over plain HTTP; there is no shared process or embedded module between them.

| Component | Responsibility |
|---|---|
| `ocr-service/main.py` | FastAPI app exposing `POST /extract-text`; loads EasyOCR once at startup (`easyocr.Reader(['en'])`), decodes the uploaded image with OpenCV, and returns a list of `{text, confidence, box}` objects. |
| `backend/server.js` | Express entrypoint. Configures CORS, JSON body parsing, mounts `/api/inspections`, `/api` (legacy), `/api/auth`, `/api/admin`, connects to MongoDB via Mongoose, and starts the HTTP listener. |
| `backend/routes/inspect.js` | Legacy single-image flow: `POST /api/inspect`, `GET/DELETE /api/history`, `PATCH /api/inspect/:id/verify`, `GET /api/inspect/:id/report`, `GET /api/dashboard`, `GET /api/violations`. |
| `backend/routes/inspections.js` | Newer multi-image flow: create inspection shell, upload multiple labeled images, trigger `/analyze` (OCR → extraction → rule engine), fetch results/violations/images, verify, and generate a report. All routes require `verifyToken`; write routes also require an `inspector`, `officer`, or `admin` role. |
| `backend/routes/auth.js` | Email/phone + password login and registration, plus OTP request/verify endpoints. |
| `backend/routes/admin.js` | Administrative endpoints (rule set / user management), gated behind the `admin` role. |
| `backend/services/complianceChecker.js` | The rule engine itself — see `RULE_ENGINE.md` for the full decision logic. |
| `backend/services/declarationExtractor.js` | Converts raw OCR lines into typed, normalized fields (e.g. parsing an MRP string into a numeric amount) for the multi-image flow. |
| `backend/services/reportGenerator.js` | Builds a PDF compliance report with `pdfkit`, including the legal disclaimer text. |
| `backend/middleware/auth.js` | `verifyToken` (validates a JWT from the `Authorization: Bearer` header) and `requireRole(...)` (role-based access control). |

## 4. Use-Case Workflow

### Single-image compliance check (`/check` page, legacy API)

1. The user opens `http://localhost:5173/check` and selects a product photo.
2. The frontend's `UploadScreen.jsx` calls `inspectImage()` (`frontend/src/api/inspectAPI.js`), which sends the file as `multipart/form-data` to `POST http://localhost:5000/api/inspect`.
3. The backend forwards the image to `POST http://127.0.0.1:8000/extract-text` on the OCR service.
4. The OCR service returns detected text lines with confidence and bounding boxes.
5. `complianceChecker.js` fetches the active `RuleSet` from MongoDB, groups OCR lines into visual rows, evaluates each rule (`PASS`/`FAIL`/`WARNING`/`NOT_APPLICABLE`/`UNABLE_TO_VERIFY`), and computes a severity-weighted compliance score.
6. The backend saves an `Inspection` document (including a base64 copy of the image) and, for any `FAIL` results, inserts corresponding `Violation` documents.
7. The frontend's `ResultsScreen.jsx` renders the overall status, score, and a per-rule breakdown with the matched evidence text and confidence.
8. The user may click **Confirm Result** or **Override / Flag for Review**, which calls `PATCH /api/inspect/:id/verify` and records the officer's decision plus an `AuditLog` entry.
9. The user may click **Download Report (PDF)**, which opens `GET /api/inspect/:id/report` in a new tab.

### Login and authentication

1. The user visits `/login` and submits an email/phone + password, which posts to `POST /api/auth/login`.
2. The backend looks up the `User` document, compares the password with `bcryptjs`, and signs a JWT (`jsonwebtoken`) containing the user's id, name, and role.
3. The frontend's `AuthContext.jsx` stores the token, role, and name in `localStorage` and exposes `isAuthenticated`/`isAdmin` to the rest of the app via `useAuth()`.
4. Protected routes (`History`, `Violations`, and the not-currently-linked `Dashboard`/`New Inspection`/`Admin` pages) are wrapped in `ProtectedRoute.jsx`, which redirects to `/login` if no token is present, and to `/dashboard` if an `adminOnly` route is visited without the admin role.
5. An OTP-based alternative login exists at `/otp-login`: `POST /api/auth/otp/request` emails a six-digit code via `nodemailer`/Gmail for an email identifier, or logs it to the backend console for a phone identifier (no SMS provider is currently configured); `POST /api/auth/otp/verify` checks the code against the `Otp` collection and issues a JWT, creating a new `viewer`-role account on first use if none exists.

### Multi-image inspection flow (not currently linked in navigation)

1. `POST /api/inspections` creates an empty `Inspection` shell with lifecycle `status: 'CREATED'`.
2. `POST /api/inspections/:id/images` accepts up to 10 labeled images (`multer`, 20 MB limit each) and creates one `ProductImage` document per file.
3. `POST /api/inspections/:id/analyze` runs OCR on every uploaded image in sequence, aggregates all detected lines, runs `declarationExtractor.js` to produce typed `ExtractedField` documents, runs `complianceChecker.js` against those fields (falling back to raw pattern matching on OCR lines where no structured field was extracted), saves `Violation` documents for any failed rules, and marks the inspection `COMPLETED` with a `complianceStatus` and `complianceScore`.
4. `GET /api/inspections/:id` returns the full inspection with populated extracted fields and violations for the detail view.

## 5. Tech Stack

| Category | Technology | Source | Why it is used here |
|---|---|---|---|
| Languages | JavaScript (Node.js) | `backend/package.json` | Express backend, Mongoose models, rule engine, PDF generation. |
| Languages | JavaScript (React/JSX) | `frontend/package.json` | Single-page frontend application. |
| Languages | Python | `ocr-service/main.py` | OCR microservice. |
| Backend/framework | Express | `backend/package.json` | HTTP server and routing for the Node backend. |
| Backend/framework | Mongoose | `backend/package.json` | Schema definitions and MongoDB access for all collections. |
| Backend/framework | Multer | `backend/package.json` | Multipart file upload handling (in-memory storage). |
| Auth | jsonwebtoken, bcryptjs | `backend/package.json` | JWT issuing/verification and password hashing. |
| Email | nodemailer | `backend/package.json` | Sends OTP codes via Gmail SMTP for email-based OTP login. |
| PDF | pdfkit | `backend/package.json` | Server-generated PDF compliance reports. |
| OCR/CV | FastAPI, Uvicorn | `ocr-service/main.py` | Lightweight Python web server for the OCR endpoint. |
| OCR/CV | EasyOCR, OpenCV (`opencv-python-headless`) | `ocr-service/main.py` | Text detection/recognition and image decoding. |
| Frontend | React, React Router | `frontend/src/App.jsx` | Component UI and client-side routing. |
| Frontend | Vite | `frontend/vite.config.js` | Dev server and build tooling. |
| Frontend | Tailwind CSS (`@tailwindcss/vite`) | `frontend/vite.config.js` | Utility-first styling. |
| Frontend | Axios | `frontend/src/api/*.js` | HTTP client for all API calls. |
| Frontend | Recharts | `frontend/src/components/HistoryScreen.jsx` | Compliance overview and missing-field bar charts on the History page. |
| Frontend | lucide-react | `frontend/src/pages/LoginPage.jsx`, `RegisterPage.jsx` | Icons on the authentication screens. |
| PWA | vite-plugin-pwa | `frontend/vite.config.js` | Service-worker-based offline caching and installable web-app manifest. |
| Database | MongoDB Atlas | `backend/.env` (`MONGO_URI`) | Stores users, inspections, rule sets, violations, and audit logs. |
| Testing | Node.js built-in test runner (`node:test`) | `backend/tests/complianceChecker.test.js` | Isolated unit tests for the rule engine's decision logic. |

## 6. How the Tech Stack Works Together

`backend/server.js` loads environment variables with `dotenv`, connects to MongoDB via Mongoose, and mounts four route groups: `/api/inspections` (new flow), `/api` (legacy flow, which supplies `/api/inspect`, `/api/history`, `/api/dashboard`, `/api/violations`), `/api/auth`, and `/api/admin`. Both inspection flows read the same `RuleSet` collection and write to the same `Inspection`, `Violation`, and `AuditLog` collections, so data created through one flow is visible to the other's history/dashboard/violations queries — the two flows are not isolated.

The legacy `Inspection` model stores the compliance verdict in a field called `complianceStatus` (`compliant` / `non-compliant` / `needs-review`), separate from `status`, which represents the pipeline's lifecycle stage (`CREATED` through `COMPLETED`/`FAILED`). The legacy route's `GET /api/history` response aliases `complianceStatus` back onto a `status` key before returning it, specifically so the existing `HistoryScreen.jsx` component — written before this distinction existed — continues to work unmodified.

OCR happens out-of-process: the backend always calls the URL in `OCR_SERVICE_URL` (`backend/.env`) over HTTP rather than importing any Python code directly, so the OCR service can be restarted, redeployed, or swapped independently of the Node backend.

Authentication state lives in two places that must stay in sync: the JWT itself (stateless, verified by `middleware/auth.js` on the backend) and `localStorage` plus React Context (`AuthContext.jsx`) on the frontend. `ProtectedRoute.jsx` reads only the frontend's cached state to decide whether to render a page or redirect; the backend independently re-verifies the JWT on every request regardless of what the frontend believes.

The compliance score is calculated as a severity-weighted percentage (`calculateScore()`/the equivalent logic in `complianceChecker.js`): `NOT_APPLICABLE` rules are excluded from both the numerator and denominator, `PASS` earns full weight, `UNABLE_TO_VERIFY`/`WARNING`/`REQUIRES_REVIEW` earn half weight, and `FAIL` earns zero — see `RULE_ENGINE.md` for the full rationale.

## 7. Repository Structure & File-by-File Breakdown

`node_modules`, Python `venv`, and `.git` are excluded below.

`backend/models/`:

| File | Role |
|---|---|
| `Inspection.js` | The central document: lifecycle `status`, `complianceStatus`, `complianceScore`, `ruleResults` array, `rawText`, `missingFields`, officer decision fields, and a legacy `imageBase64` field used by the single-image flow. |
| `RuleSet.js` | A versioned, embedded array of rule definitions (`id`, `key`, `title`, `category`, `legalReference`, `severity`, `patterns`, `applicabilityPatterns`), with `version` and `isActive`. |
| `Violation.js` | One document per failed rule, denormalized from `Inspection.ruleResults` for fast querying on the Violations page. |
| `AuditLog.js` | Records key actions (`INSPECTION_CREATED`, `INSPECTION_CONFIRMED`, `INSPECTION_OVERRIDDEN`) with a timestamp and arbitrary `details`. |
| `User.js` | Authentication accounts: `name`, `email`/`phone` (both unique+sparse), `passwordHash`, `role` (`admin`/`inspector`/`officer`/`reviewer`/`viewer`). |
| `Otp.js` | Short-lived one-time-code records (`identifier`, `code`, `expiresAt`) used by the OTP login flow. |
| `ProductImage.js` | One document per uploaded photo in the multi-image flow, including its own OCR status/lines. |
| `ExtractedField.js` | A typed, normalized field (e.g. MRP parsed to a numeric amount) produced by `declarationExtractor.js` for the multi-image flow. |

`backend/services/`:

| File | Role |
|---|---|
| `complianceChecker.js` | The rule engine. See `RULE_ENGINE.md`. |
| `declarationExtractor.js` | Converts raw OCR lines into typed `ExtractedField` records for the multi-image flow. |
| `reportGenerator.js` | Streams a PDF (via `pdfkit`) containing the product image, rule-by-rule results, legal citations, score, and the required disclaimer. |

`frontend/src/pages/`:

| File | Linked from navigation? | Role |
|---|---|---|
| `HomePage.jsx` | Yes | Landing page with a "Check a Product" call to action. |
| `CheckPage.jsx` | Yes | Single-image upload → results flow (the primary, working path). |
| `HistoryPage.jsx` | Yes | Lists past inspections with compliance-overview and missing-field charts. |
| `ViolationsPage.jsx` | Yes | Lists all recorded `Violation` documents across inspections. |
| `AboutPage.jsx` | Yes | Explains the Scan → Understand → Verify → Flag → Report pipeline and tech stack. |
| `LoginPage.jsx`, `RegisterPage.jsx`, `OtpLoginPage.jsx` | Yes (as `/login`, `/register`, `/otp-login`) | Authentication screens. |
| `DashboardPage.jsx` | No (currently unlinked) | Aggregate stat cards and severity breakdown from `GET /api/dashboard`. |
| `NewInspectionPage.jsx` | No (currently unlinked) | Multi-image creation UI for the `/api/inspections` flow. |
| `InspectionDetailPage.jsx` | No (currently unlinked) | Detail view for a single multi-image inspection. |
| `AdminPage.jsx` | No (currently unlinked) | Admin-only management screen. |

## 8. Requirements / Prerequisites

| Requirement | Source | Notes |
|---|---|---|
| Node.js | `backend/package.json`, `frontend/package.json` | Used for both the Express backend and the Vite frontend. |
| Python 3 | `ocr-service/main.py` | Used for the FastAPI OCR service. |
| MongoDB Atlas account | `backend/.env` (`MONGO_URI`) | No local MongoDB is required; the project connects to a cloud Atlas cluster. |
| Gmail account with an App Password | `backend/.env` (`EMAIL_USER`, `EMAIL_PASS`) | Required only for email-based OTP login (`/otp-login`); password-based login does not need this. |

Environment variables consumed by current source (`backend/.env`, template in `backend/.env.example`):

| Variable | Required? | Used by | Purpose |
|---|---|---|---|
| `MONGO_URI` | Yes | `server.js` | MongoDB Atlas connection string. |
| `PORT` | No (defaults to 5000) | `server.js` | Port the Express server listens on. |
| `OCR_SERVICE_URL` | Yes | `routes/inspect.js`, `routes/inspections.js` | Full URL of the OCR service's `/extract-text` endpoint. |
| `JWT_SECRET` | Yes | `middleware/auth.js`, `routes/auth.js` | Secret used to sign/verify authentication tokens. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Yes, for `scripts/seedAdmin.js` | `scripts/seedAdmin.js` | Credentials for the initial admin account created by the seed script. |
| `EMAIL_USER`, `EMAIL_PASS` | Only for email OTP login | `routes/auth.js` | Gmail account and App Password used to send OTP codes. |

## 9. Setup & Installation

```bash
git clone <repo-url>
cd "TEAM MAANAK"
```

### OCR service
```bash
cd ocr-service
python -m venv venv
venv\Scripts\activate        # macOS/Linux: source venv/bin/activate
pip install fastapi uvicorn python-multipart easyocr opencv-python-headless
uvicorn main:app
```
Runs on `http://127.0.0.1:8000`.

### Backend
```bash
cd backend
npm install
copy .env.example .env   # macOS/Linux: cp .env.example .env
```
Edit `.env` with real values, then seed the initial admin account and rule set:
```bash
node scripts/seedAdmin.js
node scripts/seedRuleSet.js
node server.js
```
Runs on `http://localhost:5000`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

### Running tests
```bash
cd backend
node --test tests/complianceChecker.test.js
```
These tests exercise `complianceChecker.js` directly with a small in-memory rule set and sample OCR lines; they do not require MongoDB, the OCR service, or the backend server to be running.

## 10. Configuration

| Configuration | Location | Effect |
|---|---|---|
| Active rule set | MongoDB `RuleSet` collection, seeded by `scripts/seedRuleSet.js` from `config/rules.json` | Determines which declarations are checked and their legal citations; only one `RuleSet` document should have `isActive: true` at a time. |
| OCR confidence threshold | `complianceChecker.js` (`CONFIDENCE_THRESHOLD`) | A matched declaration below this confidence becomes `UNABLE_TO_VERIFY` instead of an automatic `PASS`. |
| Severity weights | `complianceChecker.js` (`SEVERITY_WEIGHTS`) | Controls how much each rule's result affects the overall compliance score. |
| CORS | `backend/server.js` | Currently permissive for local development. |
| Frontend API base URL | `frontend/src/api/*.js` | Hardcoded to `http://localhost:5000`; update if the backend is deployed elsewhere. |
| PWA caching | `frontend/vite.config.js` (`VitePWA` options) | Caches the app shell and `GET /api/history` responses (`NetworkFirst`) so past results remain viewable offline. |

## 11. Known Limitations / TODOs

- Two inspection APIs currently coexist (`/api/inspect` legacy, single-image; `/api/inspections` newer, multi-image). They share the same database collections but are not otherwise unified; the newer flow's frontend pages are built but not linked from the main navigation pending further testing.
- `frontend/src/components/ProtectedRoute.jsx` and `ProtectedRoutes.jsx` both exist; only the singular file is currently imported by `App.jsx`. The plural file is unused and should be removed or reconciled.
- OTP login is fully functional for email (via Gmail SMTP through `nodemailer`) but not for phone numbers — no SMS provider is configured, so a phone OTP is currently only printed to the backend console, which is explicitly surfaced to the user in the OTP login screen's helper text rather than hidden.
- `routes/inspections.js` requires `inspector`, `officer`, or `admin` roles for write operations, and `officer` is now a valid value in `User.js`'s role enum, but no UI currently exists for an admin to assign that role to another account — it must be set directly in the database today.
- Role-based access is enforced on the backend (`requireRole`) but the frontend does not yet hide or show navigation items differently per role — a logged-in `viewer` sees the same links as an `admin`, even though the backend would reject their write attempts.
- No `ARCHITECTURE.md`-level diagram exists yet for the multi-image flow specifically; the current architecture diagram covers the legacy single-image path.
- No Dockerfile, Compose file, or CI/CD configuration exists.
- Automated tests currently cover only `complianceChecker.js` in isolation; there is no automated coverage yet for the API routes, authentication, or the OCR service itself.

## 12. License / Contributing

No standalone `LICENSE` file currently exists in this repository.

## About

Parakh AI — an AI-assisted Legal Metrology compliance checker for packaged commodities, built for Smart India Hackathon 2026 (Problem Statement 26034) by Team MAANAK.
