const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { checkCompliance } = require('../services/complianceChecker');
const Inspection = require('../models/Inspection');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Store uploaded photos temporarily in memory (not saved to disk)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/inspect', verifyToken, requireRole('admin', 'inspector'), upload.single('image'), async (req, res) => {
  try {
    // Build a form to send the image to the Python OCR service
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    // Send the image to the OCR service and wait for the text result
    const ocrResponse = await axios.post(process.env.OCR_SERVICE_URL, formData, {
      headers: formData.getHeaders(),
    });

    // Run the extracted text through the compliance rule engine
    const result = checkCompliance(ocrResponse.data.lines);

    // Save this inspection permanently to MongoDB
    const savedInspection = await Inspection.create({
      ruleResults: result.ruleResults,
      rawText: result.rawText,
      missingFields: result.missingFields,
      status: result.status,
      ruleSetVersion: result.ruleSetVersion,
    });

    res.json({
      status: result.status,
      ruleResults: result.ruleResults,
      missingFields: result.missingFields,
      evidence: result.evidence,
      ruleSetVersion: result.ruleSetVersion,
      inspectionId: savedInspection._id,
      rawText: result.rawText,
    });

  } catch (error) {
    console.error('Error during inspection:', error.message);
    res.status(500).json({ error: 'Something went wrong during inspection' });
  }
});

router.get('/history', verifyToken, async (req, res) => {
  try {
    const inspections = await Inspection.find().sort({ createdAt: -1 }).limit(20);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch inspection history' });
  }
});

router.patch('/inspect/:id/verify', verifyToken, requireRole('admin', 'inspector', 'reviewer'), async (req, res) => {
  try {
    const { decision, note } = req.body;
    const updated = await Inspection.findByIdAndUpdate(
      req.params.id,
      { officerDecision: decision, officerNote: note || '' },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Could not save verification' });
  }
});

router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const total = await Inspection.countDocuments();
    const compliant = await Inspection.countDocuments({ status: 'compliant' });
    const nonCompliant = await Inspection.countDocuments({ status: 'non-compliant' });
    const needsReview = await Inspection.countDocuments({ status: 'needs-review' });

    const severityBreakdown = await Inspection.aggregate([
      { $unwind: '$ruleResults' },
      { $match: { 'ruleResults.result': 'FAIL' } },
      { $group: { _id: '$ruleResults.severity', count: { $sum: 1 } } },
    ]);

    res.json({ total, compliant, nonCompliant, needsReview, severityBreakdown });
  } catch (error) {
    res.status(500).json({ error: 'Could not load dashboard data' });
  }
});
router.get('/violations', verifyToken, async (req, res) => {
  try {
    const inspections = await Inspection.find({ status: { $ne: 'compliant' } }).sort({ createdAt: -1 }).limit(50);
    const violations = [];
    inspections.forEach((insp) => {
      insp.ruleResults.forEach((r) => {
        if (r.result === 'FAIL') {
          violations.push({
            inspectionId: insp._id,
            date: insp.createdAt,
            title: r.title,
            severity: r.severity,
            legalReference: r.legalReference,
          });
        }
      });
    });
    res.json(violations);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch violations' });
  }
});
router.delete('/history', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await Inspection.deleteMany({});
    res.json({ message: 'History cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Could not clear history' });
  }
});
module.exports = router;