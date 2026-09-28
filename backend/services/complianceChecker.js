function textMatches(text, patterns) {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => new RegExp(pattern, 'i').test(lower));
}
function getYCenter(box) {
  const ys = box.map((p) => p[1]);
  return (Math.min(...ys) + Math.max(...ys)) / 2;
}
function getHeight(box) {
  const ys = box.map((p) => p[1]);
  return Math.max(...ys) - Math.min(...ys);
}
function getXLeft(box) {
  return Math.min(...box.map((p) => p[0]));
}

function groupIntoRows(ocrLines) {
  const sorted = [...ocrLines].sort((a, b) => getYCenter(a.box) - getYCenter(b.box));
  const rows = [];
  sorted.forEach((line) => {
    const yCenter = getYCenter(line.box);
    const threshold = Math.max(getHeight(line.box) * 0.7, 10);
    const row = rows.find((r) => Math.abs(r.yCenter - yCenter) <= threshold);
    if (row) {
      row.lines.push(line);
      row.yCenter = (row.yCenter * (row.lines.length - 1) + yCenter) / row.lines.length;
    } else {
      rows.push({ yCenter, lines: [line] });
    }
  });
  return rows.map((row) => {
    const ordered = [...row.lines].sort((a, b) => getXLeft(a.box) - getXLeft(b.box));
    return {
      text: ordered.map((l) => l.text).join(' '),
      confidence: row.lines.reduce((sum, l) => sum + l.confidence, 0) / row.lines.length,
      box: ordered[0].box,
    };
  });
}

const CONFIDENCE_THRESHOLD = 0.5;

function checkCompliance(ocrLines, ruleSet) {
  const rows = groupIntoRows(ocrLines);
  const candidates = [...rows, ...ocrLines];

  const ruleResults = [];
  const evidence = {};

  ruleSet.rules.forEach((rule) => {
    const match = candidates.find((c) => textMatches(c.text, rule.patterns));
    let result;

    if (!match) {
      result = 'FAIL';
      evidence[rule.key] = null;
    } else if (match.confidence < CONFIDENCE_THRESHOLD) {
      result = 'UNABLE_TO_VERIFY';
      evidence[rule.key] = { text: match.text, confidence: match.confidence, box: match.box };
    } else {
      result = 'PASS';
      evidence[rule.key] = { text: match.text, confidence: match.confidence, box: match.box };
    }

    ruleResults.push({
      ruleId: rule.id,
      key: rule.key,
      title: rule.title,
      category: rule.category,
      legalReference: rule.legalReference,
      severity: rule.severity,
      result,
    });
  });

  const hasFail = ruleResults.some((r) => r.result === 'FAIL');
  const hasReview = ruleResults.some((r) => r.result === 'UNABLE_TO_VERIFY');

    const severityWeight = { high: 3, medium: 2, low: 1 };
  const scoredRules = ruleResults.filter((r) => r.result !== 'NOT_APPLICABLE');
  const totalWeight = scoredRules.reduce((sum, r) => sum + (severityWeight[r.severity] || 1), 0);
  const earnedWeight = scoredRules.reduce((sum, r) => {
    const weight = severityWeight[r.severity] || 1;
    if (r.result === 'PASS') return sum + weight;
    if (r.result === 'UNABLE_TO_VERIFY' || r.result === 'WARNING') return sum + weight * 0.5;
    return sum;
  }, 0);
  const complianceScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const status = hasFail ? 'non-compliant' : hasReview ? 'needs-review' : 'compliant';
  const missingFields = ruleResults.filter((r) => r.result === 'FAIL').map((r) => r.title);
  const rawText = ocrLines.map((l) => l.text).join(' ');

  return { status, ruleResults, missingFields, evidence, rawText, ruleSetVersion: ruleSet.version, complianceScore };
}

module.exports = { checkCompliance };
