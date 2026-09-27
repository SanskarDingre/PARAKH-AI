const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
  imageBase64: String,
  ruleResults: [
    {
      ruleId: String,
      key: String,
      title: String,
      category: String,
      legalReference: String,
      severity: String,
      result: { type: String, enum: ['PASS', 'FAIL', 'UNABLE_TO_VERIFY'] },
    },
  ],
  rawText: String,
  missingFields: [String],
  status: {
    type: String,
    enum: ['compliant', 'non-compliant', 'needs-review'],
    default: 'non-compliant',
  },
  ruleSetVersion: String,
  complianceScore: { type: Number, default: 0 },
  officerDecision: { type: String, enum: ['confirmed', 'overridden', null], default: null },
  officerNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Inspection', inspectionSchema);
