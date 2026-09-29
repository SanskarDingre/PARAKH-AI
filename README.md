# Parakh AI — Legal Metrology Compliance Checker

AI-powered system to verify compliance of packaged commodities under the
**Legal Metrology (Packaged Commodities) Rules, 2011** by scanning product labels and photos.

**Team:** MAANAK | **SIH Problem Statement:** 26034 | **Version:** 2.0.0

---

## Architecture

Three services that must run simultaneously:

| Service | Tech | Port |
|---|---|---|
| `ocr-service/` | Python/FastAPI/EasyOCR | 8000 |
| `backend/` | Node.js/Express/MongoDB | 5000 |
| `frontend/` | React 19/Vite/TailwindCSS 4 | 5173 |

---

## Quick Start

### 1. OCR Service (Python)

```bash
cd ocr-service
python -m venv venv
venv\Scripts\activate           # On Mac/Linux: source venv/bin/activate
pip install fastapi uvicorn python-multipart easyocr opencv-python-headless
uvicorn main:app --reload
```

Runs on `http://127.0.0.1:8000`

### 2. Backend (Node.js)

```bash
cd backend
npm install
# Create your .env from the example:
copy .env.example .env          # On Mac/Linux: cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.
# Seed the database:
npm run seed:admin
npm run seed:rules
# Start:
npm run dev
```

Runs on `http://localhost:5000`

### 3. Frontend (React)

```bash
cd frontend
npm install
# Create your .env.local:
echo VITE_API_URL=http://localhost:5000 > .env.local
npm run dev
```

Runs on `http://localhost:5173`

---

## Features

### Phase 1 (Implemented ✅)
- **Multi-image upload** — drag & drop with per-image label picker (front/back/side/MRP/ingredients)
- **EasyOCR pipeline** — runs on every uploaded image, returns bounding boxes
- **15-rule LMPC-2011 engine** — all rules cite actual rule numbers (Rule 6(1)(a), 6(1)(b), etc.)
- **Declaration extraction** — structured extraction of 12 field types with type normalization
  - MRP → `{amount: 99, currency: 'INR'}`
  - Net Quantity → `{amount: 500, unit: 'g'}`
  - Dates → `{display: 'Jan 2025', year: 2025, month: 1}`
- **Evidence viewer** — canvas overlay with OCR bounding boxes highlighting detected text
- **Compliance scoring** — weighted by severity (High×3, Medium×2, Low×1)
- **Rule results**: PASS / FAIL / UNABLE_TO_VERIFY / NOT_APPLICABLE / REQUIRES_REVIEW
- **Inspection lifecycle** tracking: CREATED → OCR_PROCESSING → EXTRACTING → VALIDATING → COMPLETED
- **PDF report** with extracted fields, rule results, violations, officer decision
- **Searchable history** with status filter and pagination
- **Officer verification** — confirm or override AI result with audit trail
- **Admin panel** — user management, role assignment
- **RBAC** — viewer, inspector, officer, admin roles
- **All routes protected** — JWT required on all inspect/history/violations/dashboard endpoints

### Legal Rules Implemented
| Rule ID | Rule | Severity |
|---|---|---|
| LM-PC-6-1-A | Manufacturer / Packer Details | High |
| LM-PC-6-1-A2 | Importer Details | High |
| LM-PC-6-1-B | Generic / Common Name | High |
| LM-PC-6-1-C | Net Quantity | High |
| LM-PC-6-1-D | Month and Year of Manufacture | Medium |
| LM-PC-6-1-E | Maximum Retail Price (MRP) | High |
| LM-PC-6-2 | Consumer Care Details | Medium |
| LM-PC-6-1-F | Best Before / Expiry Date | High |
| LM-PC-6-1-G | Country of Origin | Medium |
| LM-PC-6-1-E2 | Unit Sale Price | Low |
| LM-PC-7 | Batch / Lot Number | Medium |
| LM-PC-6-1-B2 | Product / Brand Name | Medium |
| LM-PC-10 | Net Weight in Standard Units | Medium |
| FSSAI-REG | FSSAI License Number | Medium |
| LM-PC-6-1-E3 | MRP Inclusive of All Taxes | Low |

---

## API Reference

### Auth
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login with password |
| POST | /api/auth/otp/request | Request OTP |
| POST | /api/auth/otp/verify | Verify OTP |
| GET | /api/auth/me | Get current user |

### Inspections (New Multi-Image API)
| Method | Path | Description |
|---|---|---|
| POST | /api/inspections | Create empty inspection |
| GET | /api/inspections | List with search/filter |
| GET | /api/inspections/:id | Full inspection detail |
| POST | /api/inspections/:id/images | Upload images (multipart) |
| POST | /api/inspections/:id/analyze | Run OCR + extraction + rules |
| GET | /api/inspections/:id/results | Get rule results |
| GET | /api/inspections/:id/violations | Get violations |
| GET | /api/inspections/:id/images/:imgId | Get image with OCR lines |
| PATCH | /api/inspections/:id/verify | Officer verify/override |
| GET | /api/inspections/:id/report | Download PDF report |

### Legacy (Backward Compatible)
| Method | Path | Description |
|---|---|---|
| POST | /api/inspect | Single-image inspect |
| GET | /api/history | Legacy history |
| GET | /api/dashboard | Dashboard stats |
| GET | /api/violations | All violations |

---

## Environment Variables

See `backend/.env.example` for the full list. Key variables:
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — Long random secret for JWT signing
- `OCR_SERVICE_URL` — URL of the FastAPI OCR service
- `EMAIL_USER`, `EMAIL_PASS` — Gmail SMTP for OTP (optional)

---

## Disclaimer

This system provides AI-assisted preliminary compliance assessments. Final legal determination
remains subject to authorized inspection and applicable law. Results do not constitute an official
government certificate or clearance.
