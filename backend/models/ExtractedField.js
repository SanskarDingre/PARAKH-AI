const mongoose = require('mongoose');

/**
 * ExtractedField — one document per declaration found during an inspection.
 * Each field stores its raw OCR value, normalized/typed value, source image,
 * bounding box, and confidence. This is the structured output of the
 * declarationExtractor service.
 */
const extractedFieldSchema = new mongoose.Schema({
  inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection', required: true, index: true },
  imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductImage' },

  fieldKey: {
    type: String,
    required: true,
    // e.g. 'mrp', 'netQuantity', 'manufacturer', 'mfgDate', 'bestBefore', 'consumerCare', ...
  },

  // Raw OCR text from which this field was extracted
  rawValue: { type: String },

  // Normalized/typed value (e.g. for MRP: { amount: 99, currency: 'INR' })
  normalizedValue: { type: mongoose.Schema.Types.Mixed },

  // Unit of measure if applicable (e.g. 'g', 'ml', 'INR')
  unit: { type: String },

  // OCR confidence of the source line (0-1)
  confidence: { type: Number, min: 0, max: 1 },

  // Bounding box in normalized [0,1] coords or pixel coords
  bbox: {
    x: Number,      // left
    y: Number,      // top
    width: Number,
    height: Number,
    // Also store raw quad points from EasyOCR for precise polygon drawing
    quad: { type: mongoose.Schema.Types.Mixed },
  },

  // Extraction method: 'pattern', 'regex', 'normalization', 'manual'
  source: { type: String, default: 'pattern' },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ExtractedField', extractedFieldSchema);
