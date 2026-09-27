const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection', required: true },
  ruleId: String,
  title: String,
  category: String,
  legalReference: String,
  severity: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Violation', violationSchema);
