# Parakh AI — Legal Metrology Compliance Checker

**SIH 2026 | Problem Statement 26034 | Team MAANAK**

An AI-powered system that scans packaged-product labels, extracts
declarations using OCR, checks them against the Legal Metrology
(Packaged Commodities) Rules, 2011, and produces an evidence-backed
compliance verdict with a downloadable PDF report.

## Architecture

Three independent services run together:

1. **ocr-service** (Python / FastAPI / EasyOCR) — reads text from a
   package photo and returns detected lines with confidence scores and
   bounding boxes.
2. **backend** (Node.js / Express / MongoDB) — receives uploads, runs
   the rule engine against the OCR text, stores results, generates PDF
   reports, and handles authentication.
3. **frontend** (React / Vite / Tailwind) — the web app used to upload
   photos, view results, and browse inspection history.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a deeper breakdown and
[`RULE_ENGINE.md`](./RULE_ENGINE.md) for how compliance is actually
determined.

## Features

- Photo → OCR → rule-based compliance check, with real legal
  citations (Legal Metrology (Packaged Commodities) Rules, 2011 — Rule
  6) for every requirement checked
- Five result states per rule: `PASS`, `FAIL`, `WARNING`,
  `NOT_APPLICABLE`, `UNABLE_TO_VERIFY` — not just pass/fail
- A confidence-weighted compliance score (0–100%), not a hardcoded number
- Evidence shown per field: the exact matched text and OCR confidence
- Manual officer review: confirm or override any automated result
- Downloadable PDF compliance report, including the required
  "AI-assisted preliminary assessment" disclaimer
- Inspection history and a violations log, backed by MongoDB
- JWT-based authentication with role support (admin / inspector /
  officer / reviewer / viewer)
- A versioned rule set stored in the database (`RuleSet` collection),
  so Legal Metrology amendments can be added without changing code

## Setup Instructions

### 1. OCR Service
```bash
cd ocr-service
python -m venv venv
venv\Scripts\activate        # On Mac/Linux: source venv/bin/activate
pip install fastapi uvicorn python-multipart easyocr opencv-python-headless
uvicorn main:app
```
Runs on http://127.0.0.1:8000

### 2. Backend
```bash
cd backend
npm install
```
Copy `.env.example` to `.env` and fill in real values (see that file
for what each variable means), then seed the database:
```bash
node scripts/seedAdmin.js
node scripts/seedRuleSet.js
node server.js
```
Runs on http://localhost:5000

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173

## Current Status

The core pipeline (photo → OCR → rule engine → evidence → PDF report
→ history) is complete and tested against real product labels. A
newer multi-image inspection flow (`/api/inspections`) exists in the
codebase but its dashboard and creation UI are still being refined —
currently not linked from the main navigation while that work
continues, in favor of keeping the simpler, fully-working single-image
flow (`/check`) as the primary path.

## Disclaimer

This tool produces an **AI-assisted preliminary compliance
assessment**. It is not an official government certificate; final
legal determination remains subject to authorized inspection and
applicable law.
