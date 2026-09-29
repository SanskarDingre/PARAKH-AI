const mongoose = require('mongoose');

const ocrLineSchema = new mongoose.Schema({
  text: String,
  confidence: Number,
  box: { type: mongoose.Schema.Types.Mixed }, // [[x,y], [x,y], [x,y], [x,y]] quad points
}, { _id: false });

const productImageSchema = new mongoose.Schema({
  inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection', required: true, index: true },
  label: {
    type: String,
    enum: ['front', 'back', 'side', 'mrp', 'ingredients', 'other'],
    default: 'other',
  },
  originalData: String,     // base64 data URI of original image (evidence)
  processedData: String,    // base64 data URI after preprocessing (if any)
  mimeType: String,
  filename: String,
  sizeBytes: Number,
  width: Number,
  height: Number,
  ocrLines: [ocrLineSchema],
  ocrRawText: String,
  ocrStatus: {
    type: String,
    enum: ['pending', 'processing', 'done', 'failed'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ProductImage', productImageSchema);
