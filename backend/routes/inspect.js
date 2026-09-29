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
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are accepted'));
  },
});

// All legacy inspect routes require auth
router.use(verifyToken);

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
    // Support both old 'status' field and new 'complianceStatus' field
    const compliant = await Inspection.countDocuments({ $or: [{ complianceStatus: 'compliant' }, { status: 'compliant' }] });
    const nonCompliant = await Inspection.countDocuments({ $or: [{ complianceStatus: 'non-compliant' }, { status: 'non-compliant' }] });
    const needsReview = await Inspection.countDocuments({ $or: [{ complianceStatus: 'needs-review' }, { status: 'needs-review' }] });
    const severityBreakdown = await Violation.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    // Recent inspections for dashboard table
    const recent = await Inspection.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id productName complianceStatus complianceScore complianceScore createdAt inspectorName')
      .lean();
    res.json({ total, compliant, nonCompliant, needsReview, severityBreakdown, recent });
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

// ── GET /api/dashboard/trends — daily inspection counts for the last N days ──
router.get('/dashboard/trends', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const raw = await Inspection.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: {
              $ifNull: [
                '$complianceStatus',
                { $cond: [{ $in: ['$status', ['compliant', 'non-compliant', 'needs-review']] }, '$status', 'non-compliant'] }
              ]
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Build a complete date map for the range (fill zeros for missing days)
    const dateMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dateMap[key] = { date: key, compliant: 0, 'non-compliant': 0, 'needs-review': 0, total: 0 };
    }

    for (const entry of raw) {
      const { date, status } = entry._id;
      if (!dateMap[date]) continue;
      const safeStatus = ['compliant', 'non-compliant', 'needs-review'].includes(status) ? status : 'non-compliant';
      dateMap[date][safeStatus] += entry.count;
      dateMap[date].total += entry.count;
    }

    res.json(Object.values(dateMap));
  } catch (error) {
    console.error('Trends error:', error.message);
    res.status(500).json({ error: 'Could not load trend data' });
  }
});

// ── GET /api/dashboard/scores — score bucket distribution ────────────────────
router.get('/dashboard/scores', async (req, res) => {
  try {
    const buckets = [
      { label: '0–20', min: 0, max: 20 },
      { label: '21–40', min: 21, max: 40 },
      { label: '41–60', min: 41, max: 60 },
      { label: '61–80', min: 61, max: 80 },
      { label: '81–100', min: 81, max: 100 },
    ];

    const counts = await Promise.all(
      buckets.map((b) =>
        Inspection.countDocuments({ complianceScore: { $gte: b.min, $lte: b.max } })
          .then((count) => ({ label: b.label, count }))
      )
    );

    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: 'Could not load score distribution' });
  }
});

module.exports = router;

