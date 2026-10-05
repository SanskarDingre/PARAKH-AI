const test = require('node:test');
const assert = require('node:assert');
const { checkCompliance } = require('../services/complianceChecker');

const testRuleSet = {
  version: 'TEST-v1',
  rules: [
    {
      key: 'mrp', id: 'LM-PC-6-1-E', title: 'Maximum Retail Price (MRP)',
      category: 'Price Declaration', legalReference: 'Rule 6(1)(e)', severity: 'high',
      patterns: ['mrp', 'rs\\.?\\s?\\d+'],
    },
    {
      key: 'netQuantity', id: 'LM-PC-6-1-C', title: 'Net Quantity',
      category: 'Quantity Declaration', legalReference: 'Rule 6(1)(c)', severity: 'high',
      patterns: ['net qty', '\\d+\\s?(g|kg)\\b'],
    },
    {
      key: 'consumerCare', id: 'LM-PC-6-2', title: 'Consumer Care Details',
      category: 'Contact Declaration', legalReference: 'Rule 6(2)', severity: 'low',
      patterns: ['consumer care', 'helpline'],
    },
    {
      key: 'importerDetails', id: 'LM-PC-6-1-A2', title: 'Importer Details',
      category: 'Identity Declaration', legalReference: 'Rule 6(1)(a)', severity: 'high',
      applicability: 'conditional', applicabilityPatterns: ['imported'],
      patterns: ['imported by'],
    },
  ],
};

function makeLine(text, confidence) {
  return { text, confidence, box: [[0, 0], [100, 0], [100, 20], [0, 20]] };
}

test('MRP present with high confidence results in PASS', () => {
  const result = checkCompliance([makeLine('MRP Rs. 120', 0.9)], testRuleSet);
  assert.strictEqual(result.ruleResults.find((r) => r.key === 'mrp').result, 'PASS');
});

test('Missing rule results in FAIL', () => {
  const result = checkCompliance([makeLine('Some unrelated text', 0.9)], testRuleSet);
  assert.strictEqual(result.ruleResults.find((r) => r.key === 'netQuantity').result, 'FAIL');
});

test('Rule with unmet applicability condition results in NOT_APPLICABLE', () => {
  const result = checkCompliance([makeLine('Aloo Bhujiya 100g MRP Rs. 50', 0.9)], testRuleSet);
  assert.strictEqual(result.ruleResults.find((r) => r.key === 'importerDetails').result, 'NOT_APPLICABLE');
});

test('Low-confidence match results in UNABLE_TO_VERIFY, not an automatic PASS', () => {
  const result = checkCompliance([makeLine('MRP 120', 0.3)], testRuleSet);
  assert.strictEqual(result.ruleResults.find((r) => r.key === 'mrp').result, 'UNABLE_TO_VERIFY');
});

test('Overall status is non-compliant when any rule fails', () => {
  const result = checkCompliance([makeLine('nothing relevant here', 0.9)], testRuleSet);
  assert.strictEqual(result.status, 'non-compliant');
});

test('Compliance score excludes NOT_APPLICABLE rules from the calculation', () => {
  const ocrLines = [
    makeLine('MRP Rs. 120', 0.9),
    makeLine('Net Qty 100g', 0.9),
    makeLine('Consumer care helpline', 0.9),
  ];
  const result = checkCompliance(ocrLines, testRuleSet);
  // mrp, netQuantity, consumerCare all PASS; importerDetails is NOT_APPLICABLE (not imported) → excluded
  assert.strictEqual(result.complianceScore, 100);
});
