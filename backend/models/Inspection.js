const mongoose = require('mongoose');

const ruleResultSchema = new mongoose.Schema({
  ruleId: String,
  key: String,
  title: String,
  category: String,
  legalReference: String,
  severity: String,
  result: {
    type: String,
    enum: ['PASS', 'FAIL', 'WARNING', 'NOT_APPLICABLE', 'UNABLE_TO_VERIFY', 'REQUIRES_REVIEW'],
  },
  // Evidence for this rule result
  evidence: {
    rawValue: String,
    normalizedValue: mongoose.Schema.Types.Mixed,
    confidence: Number,
    imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductImage' },
    bbox: mongoose.Schema.Types.Mixed,
    explanation: String,
  },
}, { _id: false });

const inspectionSchema = new mongoose.Schema({
  // --- Lifecycle status ---
  status: {
    type: String,
    enum: ['CREATED', 'UPLOADING', 'PROCESSING', 'OCR_PROCESSING', 'EXTRACTING', 'VALIDATING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED'],
    default: 'CREATED',
  },

  // --- Who created it ---
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inspectorName: String,

  // --- Product info (extracted or manually entered) ---
  productName: { type: String, default: '' },
  manufacturerName: { type: String, default: '' },
  batchNumber: { type: String, default: '' },

  // --- Images (refs to ProductImage docs) ---
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductImage' }],

  // --- Extracted fields (refs to ExtractedField docs) ---
  extractedFields: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ExtractedField' }],

  // --- Rule engine results ---
  ruleSetId: { type: mongoose.Schema.Types.ObjectId, ref: 'RuleSet' },
  ruleSetVersion: String,
  ruleResults: [ruleResultSchema],
  rawText: String,                // aggregated OCR text from all images
  missingFields: [String],

  // --- Compliance outcome ---
  complianceStatus: {
    type: String,
    enum: ['compliant', 'non-compliant', 'needs-review'],
    default: 'non-compliant',
  },
  complianceScore: { type: Number, default: 0 },

  // --- Officer decision (reviewer/officer action) ---
  officerDecision: { type: String, enum: ['confirmed', 'overridden', null], default: null },
  officerNote: { type: String, default: '' },
  officerName: { type: String, default: '' },
  reviewedAt: Date,

  // --- Legacy field for backward compat (single-image flow) ---
  imageBase64: String,

  // --- Timestamps ---
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
  failedReason: String,
});

// Backward-compat alias: old code reads `inspection.status` expecting 'compliant'/'non-compliant'
// We store lifecycle status in `status` and compliance outcome in `complianceStatus`
// The old dashboard query uses status: 'compliant' so we keep complianceStatus for that.
// Virtual for backward-compat reading of status as complianceStatus:
inspectionSchema.virtual('legacyStatus').get(function () {
  return this.complianceStatus;
});

module.exports = mongoose.model('Inspection', inspectionSchema);
