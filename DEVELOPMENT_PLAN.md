# DEVELOPMENT_PLAN.md
# Parakh AI — SIH 2026 Legal Metrology Compliance Checker
# PS ID: 26034 | Team MAANAK

---

## 1. CURRENT ARCHITECTURE (Audited: 2026-09-28)

```
TEAM MAANAK/
├── backend/                    Node.js / Express 5
│   ├── config/rules.json       6 LMPC rules (static seed)
│   ├── middleware/auth.js      verifyToken, requireRole
│   ├── models/
│   │   ├── AuditLog.js         action, inspectionId, details, timestamp
│   │   ├── Inspection.js       imageBase64, ruleResults[], status, score
│   │   ├── Otp.js              identifier, code, expiresAt
│   │   ├── RuleSet.js          version, rules[], isActive
│   │   ├── User.js             name, email, phone, passwordHash, role
│   │   └── Violation.js        inspectionId, ruleId, severity, title
│   ├── routes/
│   │   ├── admin.js            GET/users, PATCH role, GET ruleset, GET audit
│   │   ├── auth.js             register, login, otp/*, /me
│   │   └── inspect.js          POST/inspect, GET/history, dashboard, violations
│   ├── scripts/
│   │   ├── seedAdmin.js
│   │   └── seedRuleSet.js
│   ├── services/
│   │   ├── complianceChecker.js   Pattern-match rule engine
│   │   └── reportGenerator.js     PDFKit PDF
│   └── server.js
│
├── frontend/                   React 19 / Vite / TailwindCSS 4
│   └── src/
│       ├── api/inspectAPI.js
│       ├── context/AuthContext.jsx
│       ├── components/
│       │   ├── HistoryScreen.jsx
│       │   ├── Layout.jsx / Navbar.jsx / Footer.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── ResultsScreen.jsx
│       │   └── UploadScreen.jsx
│       └── pages/
│           ├── AboutPage / AdminPage / CheckPage / DashboardPage
│           ├── HistoryPage / HomePage / LoginPage / OtpLoginPage
│           ├── RegisterPage / ViolationsPage
│           └── (MISSING: InspectionDetailPage, ProductPage)
│
└── ocr-service/                Python / FastAPI / EasyOCR
    └── main.py                 Single endpoint: POST /extract-text
```

---

## 2. WHAT CURRENTLY WORKS ✅

| Feature | Status |
|---|---|
| User registration & login (password) | ✅ Working |
| OTP login (email) | ✅ Working |
| JWT auth + protected routes | ✅ Working |
| Single image upload → OCR → compliance check | ✅ Working |
| 6-rule LMPC rule engine (pattern matching) | ✅ Working |
| Compliance score calculation | ✅ Working |
| PDF report download | ✅ Working |
| Inspection saved to MongoDB | ✅ Working |
| Violations saved separately | ✅ Working |
| AuditLog | ✅ Working |
| Dashboard stats (totals, severity breakdown) | ✅ Working |
| Inspection history list | ✅ Working |
| Officer verify/override | ✅ Working |
| Admin: user role management | ✅ Working |
| Admin: rule set viewer | ✅ Working |
| Drag-and-drop image upload | ✅ Working |
| Camera capture | ✅ Working |
| Auth context (reactive state) | ✅ Working |

---

## 3. WHAT IS PARTIALLY IMPLEMENTED ⚠️

| Feature | Gap |
|---|---|
| Rule engine | Only 6 rules; pattern-only matching; no field normalization; no conditional applicability |
| OCR service | Works but returns only raw text+confidence+box; no preprocessing; no multi-image |
| Inspection model | Single imageBase64 blob; no per-image model; no status tracking |
| Evidence system | No bounding-box image overlay/highlight viewer |
| Dashboard charts | Pie + bar exist; no time-trend chart; no "violations over time" |
| History page | List works; no search/filter; no click-through to detail |
| Violations page | List + filter by severity; no evidence link |
| PDF report | Works but basic; no images embedded properly; no declaration table |

---

## 4. WHAT IS MISSING ❌

| Feature | Priority |
|---|---|
| **Multiple image upload** (front/back/side) | P0 |
| **Image preprocessing** (denoise, contrast, deskew) in OCR service | P0 |
| **Inspection status tracking** (CREATED → PROCESSING → COMPLETED) | P0 |
| **Structured declaration extraction** (MRP, net qty, mfg date as typed fields) | P0 |
| **Field normalization** (₹99/Rs.99 → {amount:99, currency:"INR"}) | P0 |
| **Evidence bounding-box viewer** (highlight on image) | P0 |
| **ProductImage model** (separate per-image storage) | P0 |
| **ExtractedField model** (structured typed field with bbox) | P0 |
| **Inspection detail page** | P0 |
| **Expanded rule set** (all LMPC 2011 mandatory declarations) | P1 |
| **Conditional rules** (imported products, shelf-life products) | P1 |
| **Search + filter in history** | P1 |
| **Dashboard trend chart** (inspections over time) | P1 |
| **Demo/seed inspection data** | P1 |
| **DEVELOPMENT_PLAN.md / README / API.md** | P1 |
| **DOCX export** | P2 |
| **Font-size / readability analysis** | P2 |
| **Docker** | P2 |
| **Category-specific rules** | P2 |
| **.env.example** | P1 |
| **Rate limiting** | P2 |

---

## 5. TARGET ARCHITECTURE

```
┌─────────────────────────────────────────────┐
│               FRONTEND (React/Vite)         │
│  HomePage │ CheckPage │ InspectionDetail    │
│  Dashboard │ History │ Violations │ Admin   │
│  AuthContext │ React Router │ Recharts      │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│            BACKEND (Express/Node)            │
│  /auth  /inspections  /admin  /dashboard    │
│  verifyToken │ requireRole │ AuditLog       │
│  complianceChecker │ declarationExtractor   │
│  reportGenerator (PDFKit)                   │
└────────┬──────────────────┬─────────────────┘
         │                  │
┌────────▼──────┐  ┌────────▼────────────────┐
│  MongoDB      │  │  OCR Service (Python)    │
│  User         │  │  FastAPI + EasyOCR       │
│  Inspection   │  │  Preprocessing (OpenCV)  │
│  ProductImage │  │  POST /extract-text      │
│  ExtractedFld │  │  POST /preprocess        │
│  RuleSet/Rule │  └─────────────────────────┘
│  RuleResult   │
│  Violation    │
│  Evidence     │
│  AuditLog     │
└───────────────┘
```

---

## 6. DATABASE ARCHITECTURE (Target)

### New / Extended Models

```js
// ProductImage — one per uploaded image per inspection
{
  inspectionId: ObjectId,
  label: 'front' | 'back' | 'side' | 'mrp' | 'other',
  originalUrl: String,       // stored path or base64 ref
  processedUrl: String,      // after preprocessing
  ocrLines: [{text, confidence, box}],
  createdAt: Date
}

// ExtractedField — one per detected declaration
{
  inspectionId: ObjectId,
  imageId: ObjectId,
  fieldKey: String,          // 'mrp', 'netQuantity', 'manufacturer', ...
  rawValue: String,          // raw OCR text
  normalizedValue: Mixed,    // typed/normalized value
  unit: String,
  confidence: Number,
  bbox: {x, y, width, height},
  createdAt: Date
}
```

### Extended Inspection Model

```js
{
  status: 'CREATED'|'UPLOADING'|'PROCESSING'|'COMPLETED'|'FAILED',
  productName: String,        // extracted or entered
  images: [ObjectId],         // ref ProductImage
  extractedFields: [ObjectId],// ref ExtractedField
  ruleSetId: ObjectId,
  ruleResults: [...],
  complianceScore: Number,
  officerDecision: String,
  createdBy: ObjectId,        // ref User
  ...
}
```

---

## 7. API ARCHITECTURE (Target)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/otp/request
POST   /api/auth/otp/verify
GET    /api/auth/me

POST   /api/inspections                     create empty inspection
GET    /api/inspections                     list (search, filter, page)
GET    /api/inspections/:id                 full detail
DELETE /api/inspections/:id

POST   /api/inspections/:id/images          upload images (multipart)
DELETE /api/inspections/:id/images/:imgId

POST   /api/inspections/:id/analyze        trigger OCR + rule engine
GET    /api/inspections/:id/results
GET    /api/inspections/:id/violations
GET    /api/inspections/:id/evidence

GET    /api/dashboard/summary
GET    /api/dashboard/trends
GET    /api/dashboard/violations

GET    /api/admin/users
PATCH  /api/admin/users/:id/role
GET    /api/admin/ruleset
GET    /api/admin/audit

POST   /api/reports/:id/pdf
```

---

## 8. IMPLEMENTATION PHASES

### PHASE 1 — Multi-Image + Status Tracking (P0) ← NEXT
- [ ] New `ProductImage` Mongoose model
- [ ] Extend `Inspection` model: status, createdBy, images[]
- [ ] Backend: `POST /api/inspections` (create shell)
- [ ] Backend: `POST /api/inspections/:id/images` (upload N images)
- [ ] Backend: `POST /api/inspections/:id/analyze` (run OCR+rules)
- [ ] Frontend: Multi-image upload UI (thumbnails, label picker)
- [ ] Frontend: Live status polling during analysis
- [ ] OCR service: preprocessing endpoint

### PHASE 2 — Declaration Extraction + Normalization (P0)
- [ ] `ExtractedField` model
- [ ] `declarationExtractor.js` service
- [ ] Field normalizers (MRP, quantity, date)
- [ ] Store extracted fields per inspection
- [ ] Show typed fields in ResultsScreen

### PHASE 3 — Evidence Bounding-Box Viewer (P0)
- [ ] Canvas overlay component: draw colored boxes on image
- [ ] Link violations → bbox → image
- [ ] Evidence panel in ResultsScreen & InspectionDetail

### PHASE 4 — Inspection Detail Page (P0)
- [ ] `/inspections/:id` route
- [ ] Image gallery
- [ ] Extracted fields table
- [ ] Rule-by-rule checklist
- [ ] Evidence viewer
- [ ] Officer verification

### PHASE 5 — History Search + Dashboard Trends (P1)
- [ ] Search/filter in history (product, date, status, score)
- [ ] Time-series aggregation endpoint
- [ ] Trend line chart in dashboard

### PHASE 6 — Expanded Rule Set (P1)
- [ ] 15+ rules from LMPC 2011
- [ ] Conditional applicability (imported, shelf-life)
- [ ] Improved patterns + normalization-aware matching

### PHASE 7 — Documentation + .env.example + README (P1)
- [ ] README.md (complete)
- [ ] API.md
- [ ] RULE_ENGINE.md
- [ ] .env.example
- [ ] Updated .gitignore

### PHASE 8 — Docker + Advanced (P2)
- [ ] Dockerfile per service
- [ ] docker-compose.yml

---

## 9. RULE ENGINE DESIGN

### Current (simple pattern match)
```
patterns: ["mrp", "m\\.r\\.p", "₹\\s?\\d+"]
→ textMatches(ocrLine, patterns) → PASS/FAIL
```

### Target (deterministic + normalization-aware)
```
extractedFields (typed, normalized)
     ↓
ruleEngine.evaluate(field, rule)
     ↓
{ result, evidence, confidence, explanation }
```

Each rule has:
- `validator(extractedFields)` — deterministic function
- `applicabilityCheck(extractedFields)` — returns true/false/unknown
- `severity` — CRITICAL/HIGH/MEDIUM/LOW
- `legalReference` — exact Rule citation

---

## 10. SCORING METHODOLOGY

```
score = Σ(weight[severity] × points[result]) / Σ(weight[severity] × maxPoints)

weights: { high: 3, medium: 2, low: 1 }
points:  { PASS: 1, WARNING: 0.5, UNABLE_TO_VERIFY: 0.5, FAIL: 0, NOT_APPLICABLE: skip }
```

Displayed transparently in the UI.

---

## 11. LEGAL SOURCES

All rules reference:
- **Legal Metrology (Packaged Commodities) Rules, 2011**
- Ministry of Consumer Affairs, Food and Public Distribution
- https://consumeraffairs.nic.in/

Rule versions tracked in RuleSet model.

---

*Last updated: 2026-09-28 by Parakh AI dev agent*
