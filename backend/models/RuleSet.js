const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  key: String,
  id: String,
  title: String,
  category: String,
  requirement: String,
  legalReference: String,
  severity: String,
  patterns: [String],
}, { _id: false });

const ruleSetSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  effectiveDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  rules: [ruleSchema],
});

module.exports = mongoose.model('RuleSet', ruleSetSchema);
