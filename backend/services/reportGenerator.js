const PDFDocument = require('pdfkit');

const RESULT_COLORS = { PASS: '#22c55e', FAIL: '#ef4444', UNABLE_TO_VERIFY: '#f59e0b' };
const STATUS_LABELS = { compliant: 'COMPLIANT', 'non-compliant': 'NON-COMPLIANT', 'needs-review': 'NEEDS REVIEW' };

function generateReport(inspection, res) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="parakh-ai-report-${inspection._id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).fillColor('#1e293b').text('Parakh AI — Legal Metrology Compliance Report', { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor('#475569');
  doc.text(`Inspection ID: ${inspection._id}`);
  doc.text(`Date: ${new Date(inspection.createdAt).toLocaleString()}`);
  doc.text(`Rule Set Version: ${inspection.ruleSetVersion || 'N/A'}`);
  doc.moveDown();

  doc.fontSize(14).fillColor('#0f172a').text('Overall Status: ', { continued: true });
  doc.fillColor(inspection.status === 'compliant' ? RESULT_COLORS.PASS : inspection.status === 'needs-review' ? RESULT_COLORS.UNABLE_TO_VERIFY : RESULT_COLORS.FAIL);
  doc.text(STATUS_LABELS[inspection.status] || inspection.status);
  doc.moveDown();
  doc.fontSize(12).fillColor('#0f172a').text(`Compliance Score: ${inspection.complianceScore}%`);
  doc.moveDown();

  if (inspection.imageBase64) {
    try {
      const base64Data = inspection.imageBase64.split(',')[1] || inspection.imageBase64;
      const imgBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imgBuffer, { fit: [200, 200], align: 'center' });
      doc.moveDown();
    } catch (e) {
      // If image data is malformed, skip it rather than crash the whole report
    }
  }

  doc.fontSize(13).fillColor('#0f172a').text('Rule-by-Rule Results', { underline: true });
  doc.moveDown(0.3);

  inspection.ruleResults.forEach((r, i) => {
    doc.fontSize(11).fillColor('#0f172a').text(`${i + 1}. ${r.title}`, { continued: true });
    doc.fillColor(RESULT_COLORS[r.result] || '#000').text(`  [${r.result}]`);
    doc.fontSize(9).fillColor('#64748b');
    doc.text(`   Category: ${r.category} | Severity: ${r.severity}`);
    doc.text(`   Legal Reference: ${r.legalReference}`);
    doc.moveDown(0.4);
  });

  doc.moveDown();
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Oblique').text(
    'AI-assisted preliminary compliance assessment. Final legal determination remains subject to authorized inspection and applicable law.',
    { align: 'center' }
  );

  doc.end();
}

module.exports = { generateReport };
