/**
 * routes/inspections.js
 *
 * New multi-image inspection API:
 *   POST   /api/inspections               — create empty inspection shell
 *   GET    /api/inspections               — list with search + filter
 *   GET    /api/inspections/:id           — full detail
 *   POST   /api/inspections/:id/images    — upload one or more images (multipart)
 *   POST   /api/inspections/:id/analyze   — run OCR + extraction + rule engine
 *   GET    /api/inspections/:id/results   — rule results
 *   GET    /api/inspections/:id/violations— violations for this inspection
 *   PATCH  /api/inspections/:id/verify    — officer verify / override
 *
 * Auth: all routes require verifyToken.
 * Write routes (create, upload, analyze, verify) require inspector, officer, or admin.
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const { verifyToken, requireRole } = require('../middleware/auth');
const { checkCompliance } = require('../services/complianceChecker');
const { extractDeclarations } = require('../services/declarationExtractor');
const { generateReport } = require('../services/reportGenerator');

const Inspection = require('../models/Inspection');
const ProductImage = require('../models/ProductImage');
const ExtractedField = require('../models/ExtractedField');
const RuleSet = require('../models/RuleSet');
const Violation = require('../models/Violation');
const AuditLog = require('../models/AuditLog');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter(req, file, cb) {
    if (/image\/(jpeg|jpg|png|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, and WEBP images are accepted.'));
  },
});

// All routes require auth
router.use(verifyToken);

// ── POST /api/inspections — create empty inspection ───────────────────────────
router.post('/', requireRole('inspector', 'officer', 'admin'), async (req, res) => {
  try {
    const { productName } = req.body;
    const inspection = await Inspection.create({
      status: 'CREATED',
      createdBy: req.user.id,
      inspectorName: req.user.name,
      productName: productName || '',
    });
    await AuditLog.create({ action: 'INSPECTION_CREATED', inspectionId: inspection._id, details: { createdBy: req.user.name } });
    res.status(201).json(inspection);
  } catch (err) {
    console.error('Create inspection error:', err.message);
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

// ── GET /api/inspections — list with filter/search ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') query.complianceStatus = status;

    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ productName: re }, { manufacturerName: re }, { batchNumber: re }, { inspectorName: re }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Inspection.countDocuments(query);
    const inspections = await Inspection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-imageBase64 -ruleResults -rawText')
      .lean();

    res.json({ total, page: parseInt(page), limit: parseInt(limit), inspections });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch inspections' });
  }
});

// ── GET /api/inspections/:id — full detail ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('images', '-originalData -processedData') // exclude large base64 blobs
      .lean();
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    const extractedFields = await ExtractedField.find({ inspectionId: inspection._id }).lean();
    const violations = await Violation.find({ inspectionId: inspection._id }).lean();

    res.json({ ...inspection, extractedFields, violations });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch inspection' });
  }
});

// ── POST /api/inspections/:id/images — upload images ─────────────────────────
router.post(
  '/:id/images',
  requireRole('inspector', 'officer', 'admin'),
  upload.array('images', 10),
  async (req, res) => {
    try {
      const inspection = await Inspection.findById(req.params.id);
      if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
      if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });

      const labels = req.body.labels ? JSON.parse(req.body.labels) : [];

      await Inspection.findByIdAndUpdate(req.params.id, { status: 'UPLOADING' });

      const saved = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const label = labels[i] || 'other';
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const img = await ProductImage.create({
          inspectionId: inspection._id,
          label,
          originalData: base64,
          mimeType: file.mimetype,
          filename: file.originalname,
          sizeBytes: file.size,
          ocrStatus: 'pending',
        });
        saved.push(img._id);
      }

      await Inspection.findByIdAndUpdate(req.params.id, {
        $push: { images: { $each: saved } },
        status: 'CREATED',
      });

      res.json({ uploaded: saved.length, imageIds: saved });
    } catch (err) {
      console.error('Image upload error:', err.message);
      res.status(500).json({ error: err.message || 'Failed to upload images' });
    }
  }
);

// ── POST /api/inspections/:id/analyze — run full pipeline ────────────────────
router.post('/:id/analyze', requireRole('inspector', 'officer', 'admin'), async (req, res) => {
  const inspectionId = req.params.id;

  try {
    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    const images = await ProductImage.find({ inspectionId });
    if (images.length === 0) return res.status(400).json({ error: 'No images uploaded for this inspection' });

    const activeRuleSet = await RuleSet.findOne({ isActive: true });
    if (!activeRuleSet) return res.status(500).json({ error: 'No active rule set. Run: npm run seed:rules' });

    // Mark as processing
    await Inspection.findByIdAndUpdate(inspectionId, { status: 'PROCESSING' });

    // ── Step 1: OCR each image ────────────────────────────────────────────────
    await Inspection.findByIdAndUpdate(inspectionId, { status: 'OCR_PROCESSING' });

    const ocrLinesByImage = [];
    const allOcrLines = [];

    for (const img of images) {
      try {
        await ProductImage.findByIdAndUpdate(img._id, { ocrStatus: 'processing' });

        // Decode base64 → buffer → send to OCR service
        const base64Data = img.originalData.split(',')[1] || img.originalData;
        const imgBuffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('file', imgBuffer, { filename: img.filename || 'image.jpg', contentType: img.mimeType });

        const ocrResp = await axios.post(process.env.OCR_SERVICE_URL, formData, {
          headers: formData.getHeaders(),
          timeout: 120000, // 2 min timeout for EasyOCR
        });

        const lines = (ocrResp.data.lines || []).map((l) => ({ ...l, imageId: img._id }));

        await ProductImage.findByIdAndUpdate(img._id, {
          ocrLines: lines,
          ocrRawText: lines.map((l) => l.text).join(' '),
          ocrStatus: 'done',
        });

        ocrLinesByImage.push({ imageId: img._id, lines });
        allOcrLines.push(...lines);
      } catch (ocrErr) {
        console.error(`OCR failed for image ${img._id}:`, ocrErr.message);
        await ProductImage.findByIdAndUpdate(img._id, { ocrStatus: 'failed' });
        // Continue with other images rather than aborting the whole inspection
      }
    }

    if (allOcrLines.length === 0) {
      await Inspection.findByIdAndUpdate(inspectionId, { status: 'FAILED', failedReason: 'OCR produced no text for any image' });
      return res.status(422).json({ error: 'No text could be extracted from the uploaded images. Please use clearer photos.' });
    }

    // ── Step 2: Extract declarations ─────────────────────────────────────────
    await Inspection.findByIdAndUpdate(inspectionId, { status: 'EXTRACTING' });

    // Delete any prior extracted fields for this inspection
    await ExtractedField.deleteMany({ inspectionId });

    const extractedRaw = extractDeclarations(ocrLinesByImage);
    const savedFields = [];
    for (const field of extractedRaw) {
      const doc = await ExtractedField.create({ inspectionId, ...field });
      savedFields.push(doc);
    }

    // ── Step 3: Run rule engine ───────────────────────────────────────────────
    await Inspection.findByIdAndUpdate(inspectionId, { status: 'VALIDATING' });

    const result = checkCompliance(allOcrLines, activeRuleSet, savedFields);

    // ── Step 4: Save rule results + violations ────────────────────────────────
    const failedRules = result.ruleResults.filter((r) => r.result === 'FAIL');
    await Violation.deleteMany({ inspectionId });
    if (failedRules.length > 0) {
      await Violation.insertMany(
        failedRules.map((r) => ({
          inspectionId,
          ruleId: r.ruleId,
          title: r.title,
          category: r.category,
          legalReference: r.legalReference,
          severity: r.severity,
          evidence: r.evidence,
        }))
      );
    }

    // ── Step 5: Finalize inspection ───────────────────────────────────────────
    const updatedInspection = await Inspection.findByIdAndUpdate(
      inspectionId,
      {
        status: 'COMPLETED',
        complianceStatus: result.complianceStatus,
        ruleSetVersion: activeRuleSet.version,
        ruleSetId: activeRuleSet._id,
        ruleResults: result.ruleResults,
        rawText: result.rawText,
        missingFields: result.missingFields,
        complianceScore: result.complianceScore,
        extractedFields: savedFields.map((f) => f._id),
        completedAt: new Date(),
      },
      { new: true }
    );

    await AuditLog.create({
      action: 'INSPECTION_COMPLETED',
      inspectionId,
      details: { status: result.complianceStatus, score: result.complianceScore, rulesRun: result.ruleResults.length },
    });

    res.json({
      inspectionId,
      status: result.complianceStatus,         // backward compat
      complianceStatus: result.complianceStatus,
      complianceScore: result.complianceScore,
      ruleResults: result.ruleResults,
      missingFields: result.missingFields,
      evidence: result.evidence,
      ruleSetVersion: activeRuleSet.version,
      rawText: result.rawText,
      extractedFields: savedFields,
      imagesProcessed: ocrLinesByImage.length,
    });
  } catch (err) {
    console.error('Analyze error:', err.message, err.stack);
    await Inspection.findByIdAndUpdate(inspectionId, { status: 'FAILED', failedReason: err.message });
    res.status(500).json({ error: 'Analysis failed: ' + err.message });
  }
});

// ── GET /api/inspections/:id/results ─────────────────────────────────────────
router.get('/:id/results', async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id).lean();
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    const extractedFields = await ExtractedField.find({ inspectionId: inspection._id }).lean();
    res.json({ ruleResults: inspection.ruleResults, complianceScore: inspection.complianceScore, complianceStatus: inspection.complianceStatus, extractedFields });
  } catch {
    res.status(500).json({ error: 'Could not fetch results' });
  }
});

// ── GET /api/inspections/:id/violations ───────────────────────────────────────
router.get('/:id/violations', async (req, res) => {
  try {
    const violations = await Violation.find({ inspectionId: req.params.id }).lean();
    res.json(violations);
  } catch {
    res.status(500).json({ error: 'Could not fetch violations' });
  }
});

// ── GET /api/inspections/:id/images/:imgId — get image data ──────────────────
router.get('/:id/images/:imgId', async (req, res) => {
  try {
    const img = await ProductImage.findOne({ _id: req.params.imgId, inspectionId: req.params.id });
    if (!img) return res.status(404).json({ error: 'Image not found' });
    res.json({
      _id: img._id,
      label: img.label,
      originalData: img.originalData,
      ocrLines: img.ocrLines,
      ocrStatus: img.ocrStatus,
    });
  } catch {
    res.status(500).json({ error: 'Could not fetch image' });
  }
});

// ── PATCH /api/inspections/:id/verify ─────────────────────────────────────────
router.patch('/:id/verify', requireRole('inspector', 'officer', 'reviewer', 'admin'), async (req, res) => {
  try {
    const { decision, note } = req.body;
    if (!['confirmed', 'overridden'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "confirmed" or "overridden"' });
    }
    const updated = await Inspection.findByIdAndUpdate(
      req.params.id,
      { officerDecision: decision, officerNote: note || '', officerName: req.user.name, reviewedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Inspection not found' });
    await AuditLog.create({
      action: decision === 'confirmed' ? 'INSPECTION_CONFIRMED' : 'INSPECTION_OVERRIDDEN',
      inspectionId: req.params.id,
      details: { officer: req.user.name, note: note || '' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Could not save verification' });
  }
});

// ── GET /api/inspections/:id/report — generate PDF ────────────────────────────
router.get('/:id/report', async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id).lean();
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    const extractedFields = await ExtractedField.find({ inspectionId: inspection._id }).lean();
    const images = await ProductImage.find({ inspectionId: inspection._id }).lean();
    generateReport({ ...inspection, extractedFields, images }, res);
  } catch (err) {
    res.status(500).json({ error: 'Could not generate report' });
  }
});

module.exports = router;
