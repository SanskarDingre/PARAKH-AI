const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { checkCompliance } = require('../services/complianceChecker');
const { generateReport } = require('../services/reportGenerator');
const Inspection = require('../models/Inspection');
const RuleSet = require('../models/RuleSet');
const Violation = require('../models/Violation');
const AuditLog = require('../models/AuditLog');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/inspect', upload.single('image'), async (req, res) => {
  try {
    const activeRuleSet = await RuleSet.findOne({ isActive: true });
    if (!activeRuleSet) {
      return res.status(500).json({ error: 'No active rule set configured. Run the seed script first.' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const ocrResponse = await axios.post(process.env.OCR_SERVICE_URL, formData, {
      headers: formData.getHeaders(),
    });

    const result = checkCompliance(ocrResponse.data.lines, activeRuleSet);

    const savedInspection = await Inspection.create({
      imageBase64: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      ruleResults: result.ruleResults,
      rawText: result.rawText,
      missingFields: result.missingFields,
      status: result.status,
      ruleSetVersion: result.ruleSetVersion,
      complianceScore: result.complianceScore,
    });

    const failedRules = result.ruleResults.filter((r) => r.result === 'FAIL');
    if (failedRules.length > 0) {
      await Violation.insertMany(
        failedRules.map((r) => ({
          inspectionId: savedInspection._id,
          ruleId: r.ruleId,
          title: r.title,
          category: r.category,
          legalReference: r.legalReference,
          severity: r.severity,
        }))
      );
    }

    await AuditLog.create({
      action: 'INSPECTION_CREATED',
      inspectionId: savedInspection._id,
      details: { status: result.status, ruleSetVersion: result.ruleSetVersion },
    });

    res.json({
      status: result.status,
      ruleResults: result.ruleResults,
      missingFields: result.missingFields,
      evidence: result.evidence,
      ruleSetVersion: result.ruleSetVersion,
      inspectionId: savedInspection._id,
      rawText: result.rawText,
      complianceScore: result.complianceScore,
    });
  } catch (error) {
    console.error('Error during inspection:', error.message);
    res.status(500).json({ error: 'Something went wrong during inspection' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const inspections = await Inspection.find().sort({ createdAt: -1 }).limit(20);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch inspection history' });
  }
});

router.delete('/history', async (req, res) => {
  try {
    await Inspection.deleteMany({});
    await Violation.deleteMany({});
    res.json({ message: 'History cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Could not clear history' });
  }
});

router.patch('/inspect/:id/verify', async (req, res) => {
  try {
    const { decision, note } = req.body;
    const updated = await Inspection.findByIdAndUpdate(
      req.params.id,
      { officerDecision: decision, officerNote: note || '' },
      { new: true }
    );
    await AuditLog.create({
      action: decision === 'confirmed' ? 'INSPECTION_CONFIRMED' : 'INSPECTION_OVERRIDDEN',
      inspectionId: req.params.id,
      details: { note: note || '' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Could not save verification' });
  }
});

router.get('/inspect/:id/report', async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    generateReport(inspection, res);
  } catch (error) {
    res.status(500).json({ error: 'Could not generate report' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const total = await Inspection.countDocuments();
    const compliant = await Inspection.countDocuments({ status: 'compliant' });
    const nonCompliant = await Inspection.countDocuments({ status: 'non-compliant' });
    const needsReview = await Inspection.countDocuments({ status: 'needs-review' });
    const severityBreakdown = await Violation.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    res.json({ total, compliant, nonCompliant, needsReview, severityBreakdown });
  } catch (error) {
    res.status(500).json({ error: 'Could not load dashboard data' });
  }
});

router.get('/violations', async (req, res) => {
  try {
    const violations = await Violation.find().sort({ createdAt: -1 }).limit(50);
    res.json(violations.map((v) => ({
      inspectionId: v.inspectionId,
      date: v.createdAt,
      title: v.title,
      severity: v.severity,
      legalReference: v.legalReference,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch violations' });
  }
});

module.exports = router;

