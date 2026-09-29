/**
 * complianceChecker.js
 *
 * Deterministic legal rule engine for LMPC 2011 compliance.
 *
 * Input:
 *   - extractedFields: array of ExtractedField objects (from declarationExtractor)
 *   - ocrLines: raw OCR lines (for pattern fallback + applicability detection)
 *   - ruleSet: active RuleSet document from MongoDB
 *
 * Output per rule:
 *   PASS            — field found, confident, meets requirements
 *   FAIL            — field not found or confidence above threshold but clearly absent
 *   UNABLE_TO_VERIFY — found but confidence too low to determine
 *   NOT_APPLICABLE  — rule does not apply to this product (conditional rule, product not in scope)
 *   REQUIRES_REVIEW — applicability cannot be established confidently
 *
 * CRITICAL: Do NOT automatically mark missing as FAIL if confidence < CONFIDENCE_THRESHOLD.
 */

const CONFIDENCE_THRESHOLD = 0.5;
const SEVERITY_WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };

// ── Helper: pattern test on raw OCR lines ─────────────────────────────────────

function lineMatchesPatterns(text, patterns) {
  if (!patterns || patterns.length === 0) return false;
  const lower = text.toLowerCase();
  return patterns.some((p) => {
    try { return new RegExp(p, 'i').test(lower); } catch { return lower.includes(p.toLowerCase()); }
  });
}

function getCombinedText(ocrLines) {
  return ocrLines.map((l) => l.text).join(' ');
}

/**
 * Determine applicability of a rule.
 * Returns: 'always' | 'applicable' | 'not_applicable' | 'unknown'
 */
function checkApplicability(rule, ocrLines) {
  if (!rule.applicability || rule.applicability === 'always') return 'always';
  if (rule.applicabilityPatterns && rule.applicabilityPatterns.length === 0) return 'always';

  const combined = getCombinedText(ocrLines);
  const isApplicable = lineMatchesPatterns(combined, rule.applicabilityPatterns || []);
  return isApplicable ? 'applicable' : 'not_applicable';
}

// ── Core rule evaluation ──────────────────────────────────────────────────────

function evaluateRule(rule, extractedFields, ocrLines) {
  // 1. Check applicability
  const applicability = checkApplicability(rule, ocrLines);
  if (applicability === 'not_applicable') {
    return {
      result: 'NOT_APPLICABLE',
      evidence: null,
      explanation: `Rule ${rule.id} does not apply: no ${rule.applicabilityPatterns?.join('/')} indicator found.`,
    };
  }

  // 2. Try to find in extractedFields first (structured)
  const structuredField = extractedFields.find((f) => f.fieldKey === rule.key);

  if (structuredField) {
    if (structuredField.confidence >= CONFIDENCE_THRESHOLD) {
      // Additional validation for MRP
      if (rule.key === 'mrp') {
        const val = structuredField.normalizedValue;
        if (!val || typeof val.amount !== 'number' || val.amount <= 0) {
          return {
            result: 'FAIL',
            evidence: { rawValue: structuredField.rawValue, confidence: structuredField.confidence, imageId: structuredField.imageId, bbox: structuredField.bbox },
            explanation: 'MRP was found but could not be parsed as a valid price.',
          };
        }
      }
      // Additional validation for Net Quantity
      if (rule.key === 'netQuantity') {
        const val = structuredField.normalizedValue;
        if (!val || typeof val.amount !== 'number' || val.amount <= 0) {
          return {
            result: 'FAIL',
            evidence: { rawValue: structuredField.rawValue, confidence: structuredField.confidence, imageId: structuredField.imageId, bbox: structuredField.bbox },
            explanation: 'Net quantity was found but could not be parsed as a valid measurement.',
          };
        }
      }

      return {
        result: 'PASS',
        evidence: {
          rawValue: structuredField.rawValue,
          normalizedValue: structuredField.normalizedValue,
          confidence: structuredField.confidence,
          imageId: structuredField.imageId,
          bbox: structuredField.bbox,
        },
        explanation: `"${structuredField.rawValue}" — confidence: ${Math.round(structuredField.confidence * 100)}%`,
      };
    } else {
      // Found but confidence too low
      return {
        result: 'UNABLE_TO_VERIFY',
        evidence: {
          rawValue: structuredField.rawValue,
          confidence: structuredField.confidence,
          imageId: structuredField.imageId,
          bbox: structuredField.bbox,
        },
        explanation: `Possible match found ("${structuredField.rawValue}") but OCR confidence is only ${Math.round(structuredField.confidence * 100)}% — below the verification threshold.`,
      };
    }
  }

  // 3. Fallback: pattern match on raw OCR lines
  if (rule.patterns && rule.patterns.length > 0) {
    const matchingLine = ocrLines.find((l) => lineMatchesPatterns(l.text, rule.patterns));
    if (matchingLine) {
      if (matchingLine.confidence >= CONFIDENCE_THRESHOLD) {
        return {
          result: 'PASS',
          evidence: {
            rawValue: matchingLine.text,
            confidence: matchingLine.confidence,
            imageId: matchingLine.imageId || null,
            bbox: matchingLine.bbox || null,
          },
          explanation: `Pattern match: "${matchingLine.text}" — confidence: ${Math.round(matchingLine.confidence * 100)}%`,
        };
      } else {
        return {
          result: 'UNABLE_TO_VERIFY',
          evidence: {
            rawValue: matchingLine.text,
            confidence: matchingLine.confidence,
            imageId: matchingLine.imageId || null,
            bbox: matchingLine.bbox || null,
          },
          explanation: `Possible match found ("${matchingLine.text}") but OCR confidence too low: ${Math.round(matchingLine.confidence * 100)}%`,
        };
      }
    }
  }

  // 4. Not found at all
  // If applicability is unknown (conditional rule, no indicator), mark REQUIRES_REVIEW
  if (applicability === 'unknown') {
    return {
      result: 'REQUIRES_REVIEW',
      evidence: null,
      explanation: `Could not determine if this rule applies. Manual review required.`,
    };
  }

  return {
    result: 'FAIL',
    evidence: null,
    explanation: `Required declaration not found in the scanned label.`,
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function calculateScore(ruleResults) {
  const scoreable = ruleResults.filter((r) => r.result !== 'NOT_APPLICABLE');
  const totalWeight = scoreable.reduce((s, r) => s + (SEVERITY_WEIGHTS[r.severity] || 1), 0);
  if (totalWeight === 0) return 0;

  const earnedWeight = scoreable.reduce((s, r) => {
    const w = SEVERITY_WEIGHTS[r.severity] || 1;
    if (r.result === 'PASS') return s + w;
    if (r.result === 'UNABLE_TO_VERIFY' || r.result === 'WARNING' || r.result === 'REQUIRES_REVIEW') return s + w * 0.5;
    return s; // FAIL = 0 points
  }, 0);

  return Math.round((earnedWeight / totalWeight) * 100);
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Run the compliance rule engine.
 *
 * @param {Array}  ocrLines       - All OCR lines from all images: [{text, confidence, box, imageId}]
 * @param {Object} ruleSet        - Active RuleSet from MongoDB
 * @param {Array}  extractedFields - Typed field objects from declarationExtractor
 * @returns {Object} compliance result
 */
function checkCompliance(ocrLines, ruleSet, extractedFields = []) {
  const ruleResults = [];

  for (const rule of ruleSet.rules) {
    const evaluation = evaluateRule(rule, extractedFields, ocrLines);
    ruleResults.push({
      ruleId: rule.id,
      key: rule.key,
      title: rule.title,
      category: rule.category,
      legalReference: rule.legalReference,
      severity: rule.severity,
      result: evaluation.result,
      evidence: evaluation.evidence || null,
      explanation: evaluation.explanation,
    });
  }

  const complianceScore = calculateScore(ruleResults);

  const hasFail = ruleResults.some((r) => r.result === 'FAIL');
  const hasReview = ruleResults.some((r) => r.result === 'UNABLE_TO_VERIFY' || r.result === 'REQUIRES_REVIEW');
  const complianceStatus = hasFail ? 'non-compliant' : hasReview ? 'needs-review' : 'compliant';

  const missingFields = ruleResults
    .filter((r) => r.result === 'FAIL')
    .map((r) => r.title);

  const rawText = ocrLines.map((l) => l.text).join(' ');

  // Legacy evidence format (for backward compat with old ResultsScreen)
  const legacyEvidence = {};
  ruleResults.forEach((r) => {
    if (r.evidence) {
      legacyEvidence[r.key] = {
        text: r.evidence.rawValue,
        confidence: r.evidence.confidence,
        box: r.evidence.bbox,
      };
    }
  });

  return {
    complianceStatus,
    ruleResults,
    missingFields,
    evidence: legacyEvidence,
    rawText,
    ruleSetVersion: ruleSet.version,
    complianceScore,
    // Keep old 'status' key for backward compat with old inspect.js route
    status: complianceStatus,
  };
}

module.exports = { checkCompliance, calculateScore, CONFIDENCE_THRESHOLD };
