
## Request flow (single-image check)

1. User uploads a photo on the **frontend** (`/check` page).
2. The **backend** (`POST /api/inspect`) receives it and forwards the
   image to the **OCR service**.
3. The OCR service (`POST /extract-text`) runs EasyOCR and returns a
   list of detected text lines, each with a confidence score and
   bounding box.
4. The backend's `complianceChecker.js` groups OCR lines into visual
   rows (to handle multi-column labels), then checks each against the
   **active rule set** fetched from MongoDB.
5. Each rule resolves to `PASS`, `FAIL`, `WARNING`, `NOT_APPLICABLE`,
   or `UNABLE_TO_VERIFY` (the last one triggered when a match exists
   but OCR confidence is too low to trust).
6. A weighted compliance score is calculated from the results.
7. The result, evidence, and a copy of the image are saved to
   MongoDB as an `Inspection` document; any `FAIL` rules also create
   `Violation` documents.
8. The frontend displays the verdict, evidence, and score; the user
   can download a PDF report (`GET /api/inspect/:id/report`),
   generated server-side with `pdfkit`.

## Data model

- **Inspection** — one document per check: image, rule results, raw
  OCR text, compliance score, officer decision.
- **RuleSet** — a versioned snapshot of all active rules, so
  amendments to the Legal Metrology Rules can be added as a new
  version without touching code.
- **Violation** — one document per failed rule, denormalized for fast
  querying on the Violations page.
- **AuditLog** — records key actions (inspection created, confirmed,
  overridden) for traceability.
- **User** — authentication accounts with roles (admin, inspector,
  officer, reviewer, viewer).

## Why three separate services instead of one

- The OCR engine (EasyOCR/PyTorch) is Python-only and has heavy
  dependencies — keeping it isolated means the Node backend stays
  lightweight and the two can be deployed/scaled independently.
- Separating "read the image" (OCR) from "decide if it's compliant"
  (rule engine) means either can be swapped out later (e.g. a
  different OCR engine, or a smarter rule engine) without touching the
  other.
  