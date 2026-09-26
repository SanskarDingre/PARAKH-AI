
# Parakh AI — Legal Metrology Compliance Checker

AI-powered system to check compliance of packaged commodities under the
Legal Metrology (Packaged Commodities) Rules, 2011, by scanning product
labels and photos.

**Team:** MAANAK | **SIH Problem Statement:** 26034

## Architecture

This project has three separate services that must run together:

1. **ocr-service** (Python/FastAPI) — reads text from package photos
2. **backend** (Node.js/Express) — receives uploads, runs the compliance
   rule engine, stores results in MongoDB
3. **frontend** (React/Vite) — the web app used to upload photos and view
   results

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
Create a `.env` file in `backend/` with:

# TEAM MAANAK — Parakh AI
AI-powered solution for automated verification of packaged commodities against Legal Metrology rules, helping detect labeling violations and improve regulatory compliance.



