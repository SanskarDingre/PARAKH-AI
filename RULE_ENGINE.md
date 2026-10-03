# Rule Engine

## Source of truth

All rules are derived from the **Legal Metrology (Packaged
Commodities) Rules, 2011**, specifically **Rule 6**, which lists the
mandatory declarations required on every pre-packaged commodity. No
rule number or requirement in this project is invented — each is
cited to its actual sub-clause.

| Rule ID         | Requirement                          | Legal Reference |
|------------------|---------------------------------------|------------------|
| LM-PC-6-1-A      | Manufacturer / packer details         | Rule 6(1)(a)     |
| LM-PC-6-1-A2     | Importer details (imported goods only)| Rule 6(1)(a)     |
| LM-PC-6-1-C      | Net quantity                          | Rule 6(1)(c)     |
| LM-PC-6-1-D      | Month and year of manufacture         | Rule 6(1)(d)     |
| LM-PC-6-1-E      | Maximum Retail Price (MRP)            | Rule 6(1)(e)     |
| LM-PC-6-2        | Consumer care details                 | Rule 6(2)        |

## How a result is decided

For each rule, the engine:

1. **Checks applicability first.** Some rules (like importer details)
   only apply conditionally — e.g. only when the label itself
   indicates the product is imported. If a rule doesn't apply, the
   result is `NOT_APPLICABLE` and it doesn't count toward the score.
2. **Searches OCR text for a match**, using patterns specific to that
   rule (e.g. "MRP", "₹", "Rs." for price). Matching is done both
   line-by-line and on text grouped into visual rows, since OCR often
   splits a single printed line into multiple detected boxes.
3. **Checks the confidence of the match.** If no match is found at
   all, the result is `FAIL` (for high/medium severity rules) or
   `WARNING` (for low severity rules). If a match is found but OCR's
   confidence is below 50%, the result is `UNABLE_TO_VERIFY` rather
   than an automatic pass — a human should confirm it.
4. Otherwise, the result is `PASS`.

## Result meanings

| Result            | Meaning                                                        |
|--------------------|------------------------------------------------------------------|
| `PASS`             | Declaration found with acceptable OCR confidence                |
| `FAIL`             | Declaration not found at all                                    |
| `WARNING`          | A low-severity declaration is missing                           |
| `NOT_APPLICABLE`   | This rule doesn't apply to this product (e.g. not imported)      |
| `UNABLE_TO_VERIFY` | A possible match was found, but confidence is too low to trust  |

## Compliance score

The score is a severity-weighted percentage, not a flat pass/fail
count — a missing high-severity declaration (like MRP) hurts the
score more than a missing medium-severity one. `NOT_APPLICABLE` rules
are excluded entirely so they can't unfairly inflate or deflate the
score. `UNABLE_TO_VERIFY` and `WARNING` earn half credit, reflecting
genuine uncertainty rather than treating them as a hard fail.

## Why this isn't "just keyword matching"

Three things move this beyond a plain keyword search: applicability
logic (a rule can legitimately not apply), confidence-aware scoring
(a low-confidence OCR match doesn't silently become a pass), and
every result carrying its real legal citation and severity rather
than an opaque true/false.

## Versioning

Rules live in the `RuleSet` collection in MongoDB, not hardcoded in
application logic. Each `RuleSet` document has a `version` string and
an `isActive` flag — adding a new Legal Metrology amendment means
seeding a new versioned rule set and marking it active, without
changing any application code. Past rule sets are kept, not deleted,
so historical inspections remain traceable to the rules that were
actually in effect when they were checked.
