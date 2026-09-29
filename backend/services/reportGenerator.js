/**
 * reportGenerator.js
 * Generates a professional PDF compliance report using PDFKit.
 *
 * Includes:
 * - Inspection summary
 * - Extracted declarations table
 * - Rule-by-rule checklist with legal references
 * - Violation list with severity
 * - AI disclaimer
 */
const PDFDocument = require('pdfkit');

const RESULT_COLORS = {
  PASS: '#22c55e',
  FAIL: '#ef4444',
  WARNING: '#eab308',
  NOT_APPLICABLE: '#94a3b8',
  UNABLE_TO_VERIFY: '#f59e0b',
  REQUIRES_REVIEW: '#f59e0b',
};

const STATUS_LABELS = {
  compliant: 'COMPLIANT',
  'non-compliant': 'NON-COMPLIANT',
  'needs-review': 'NEEDS REVIEW',
};

function generateReport(inspection, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="parakh-ai-report-${inspection._id}.pdf"`);
  doc.pipe(res);

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.fontSize(18).fillColor('#1e293b').text('Parakh AI — Legal Metrology Compliance Report', { align: 'center' });
  doc.fontSize(10).fillColor('#64748b').text('Legal Metrology (Packaged Commodities) Rules, 2011 | SIH 2026 — PS ID: 26034', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.5);

  // ── Inspection metadata ────────────────────────────────────────────────────
  doc.fontSize(11).fillColor('#0f172a');
  doc.text(`Inspection ID: ${inspection._id}`);
  doc.text(`Product: ${inspection.productName || 'N/A'}`);
  doc.text(`Inspector: ${inspection.inspectorName || 'N/A'}`);
  doc.text(`Date: ${new Date(inspection.createdAt).toLocaleString('en-IN')}`);
  doc.text(`Rule Set Version: ${inspection.ruleSetVersion || 'N/A'}`);
  doc.moveDown();

  // ── Overall status ─────────────────────────────────────────────────────────
  const statusColor = inspection.complianceStatus === 'compliant' ? RESULT_COLORS.PASS
    : inspection.complianceStatus === 'needs-review' ? RESULT_COLORS.UNABLE_TO_VERIFY
    : RESULT_COLORS.FAIL;
  doc.fontSize(14).fillColor('#0f172a').text('Overall Status: ', { continued: true });
  doc.fillColor(statusColor).text(STATUS_LABELS[inspection.complianceStatus] || inspection.complianceStatus || 'UNKNOWN');
  doc.fontSize(12).fillColor('#0f172a').text(`Compliance Score: ${inspection.complianceScore || 0}%`);
  doc.moveDown();

  // ── Extracted declarations ─────────────────────────────────────────────────
  const fields = inspection.extractedFields || [];
  if (fields.length > 0) {
    doc.fontSize(13).fillColor('#0f172a').text('Extracted Declarations', { underline: true });
    doc.moveDown(0.3);
    fields.forEach((f) => {
      const normStr = f.normalizedValue
        ? typeof f.normalizedValue === 'object'
          ? (f.normalizedValue.amount != null ? `${f.normalizedValue.amount} ${f.unit || ''}`.trim()
            : f.normalizedValue.display || f.normalizedValue.country || f.normalizedValue.number || JSON.stringify(f.normalizedValue))
          : String(f.normalizedValue)
        : '';
      doc.fontSize(10).fillColor('#0f172a').text(`• ${f.fieldKey}:`, { continued: true });
      doc.fillColor('#1e40af').text(` ${f.rawValue}${normStr ? ` [normalized: ${normStr}]` : ''}`);
      doc.fontSize(8).fillColor('#94a3b8').text(`   Confidence: ${Math.round(f.confidence * 100)}%`);
    });
    doc.moveDown();
  }

  // ── Product image (if available via legacy flow) ───────────────────────────
  const legacyImages = inspection.images || [];
  if (inspection.imageBase64 && !legacyImages.length) {
    try {
      const base64Data = inspection.imageBase64.split(',')[1] || inspection.imageBase64;
      const imgBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imgBuffer, { fit: [150, 150], align: 'center' });
      doc.moveDown(0.5);
    } catch {
      // skip malformed image data
    }
  }

  // ── Rule-by-rule results ───────────────────────────────────────────────────
  doc.fontSize(13).fillColor('#0f172a').text('Rule-by-Rule Compliance Results', { underline: true });
  doc.moveDown(0.3);

  const ruleResults = inspection.ruleResults || [];
  ruleResults.forEach((r, i) => {
    doc.fontSize(11).fillColor('#0f172a').text(`${i + 1}. ${r.title}`, { continued: true });
    doc.fillColor(RESULT_COLORS[r.result] || '#000').text(`  [${r.result}]`);
    doc.fontSize(9).fillColor('#475569');
    doc.text(`   Category: ${r.category || 'N/A'} | Severity: ${r.severity || 'N/A'}`);
    doc.text(`   Legal Reference: ${r.legalReference || 'N/A'}`);
    if (r.evidence?.rawValue) {
      doc.text(`   Detected: "${r.evidence.rawValue}" (${Math.round((r.evidence.confidence || 0) * 100)}% confidence)`);
    }
    if (r.explanation) {
      doc.fillColor('#64748b').text(`   Note: ${r.explanation}`);
    }
    doc.moveDown(0.4);
  });

  // ── Violations ─────────────────────────────────────────────────────────────
  const violations = inspection.violations || ruleResults.filter((r) => r.result === 'FAIL');
  if (violations.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(13).fillColor('#0f172a').text('Violations', { underline: true });
    doc.moveDown(0.3);
    violations.forEach((v, i) => {
      doc.fontSize(10).fillColor('#ef4444').text(`${i + 1}. [${(v.severity || 'N/A').toUpperCase()}] ${v.title || v.ruleId}`);
      doc.fontSize(9).fillColor('#475569').text(`   ${v.legalReference || ''}`);
      doc.moveDown(0.3);
    });
  }

  // ── Officer decision ───────────────────────────────────────────────────────
  if (inspection.officerDecision) {
    doc.moveDown();
    doc.fontSize(11).fillColor('#0f172a')
      .text(`Officer Decision: `, { continued: true })
      .fillColor(inspection.officerDecision === 'confirmed' ? RESULT_COLORS.PASS : RESULT_COLORS.UNABLE_TO_VERIFY)
      .text(inspection.officerDecision.toUpperCase());
    if (inspection.officerNote) {
      doc.fontSize(9).fillColor('#475569').text(`Note: ${inspection.officerNote}`);
    }
    if (inspection.officerName) {
      doc.fontSize(9).fillColor('#475569').text(`Officer: ${inspection.officerName}`);
    }
  }

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.5);
  doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica-Oblique').text(
    'AI-assisted preliminary compliance assessment. Final legal determination remains subject to authorized inspection ' +
    'and applicable law. This report does not constitute an official government certificate or clearance. ' +
    'Generated by Parakh AI — SIH 2026, PS ID: 26034, Team MAANAK.',
    { align: 'center' }
  );

  doc.end();
}

module.exports = { generateReport };
