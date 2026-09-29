/**
 * declarationExtractor.js
 *
 * Extracts structured declaration fields from OCR lines.
 * Each field is returned with:
 *   - fieldKey: string key
 *   - rawValue: OCR text
 *   - normalizedValue: typed/cleaned value
 *   - unit: unit of measure (if applicable)
 *   - confidence: OCR confidence of the source line
 *   - bbox: bounding box {x, y, width, height} in pixels
 *   - quad: raw 4-point polygon from EasyOCR
 *   - imageId: reference to source ProductImage
 *   - source: 'pattern' | 'regex' | 'normalization'
 *
 * IMPORTANT: Does NOT invent values. If not found → returns null for that field.
 * The rule engine then decides FAIL vs UNABLE_TO_VERIFY based on confidence.
 */

const CONFIDENCE_THRESHOLD = 0.5;

// ── Normalizers ──────────────────────────────────────────────────────────────

/**
 * Normalize MRP text → { amount: Number, currency: 'INR', raw: String }
 * e.g. "MRP Rs. 99/-", "₹99.00", "MRP: INR 149" → { amount: 99, currency: 'INR' }
 */
function normalizeMRP(text) {
  // Remove common MRP label prefixes
  const cleaned = text.replace(/m\.?r\.?p\.?/gi, '').replace(/maximum retail price/gi, '').trim();
  // Extract numeric value
  const match = cleaned.match(/(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;
  return { amount, currency: 'INR', raw: text.trim() };
}

/**
 * Normalize net quantity → { amount: Number, unit: String, raw: String }
 * e.g. "Net Qty: 500 g", "500G", "0.5 kg", "500 grams" → { amount: 500, unit: 'g' }
 */
function normalizeNetQuantity(text) {
  const unitMap = {
    grams: 'g', gram: 'g', gm: 'g', gms: 'g', g: 'g',
    kilograms: 'kg', kilogram: 'kg', kg: 'kg',
    millilitres: 'ml', milliliters: 'ml', millilitre: 'ml', milliliter: 'ml', ml: 'ml',
    litres: 'L', liters: 'L', litre: 'L', liter: 'L', l: 'L',
    pieces: 'pcs', piece: 'pcs', pcs: 'pcs', pc: 'pcs',
    nos: 'nos', no: 'nos', count: 'pcs', ct: 'pcs', numbers: 'nos',
  };
  const match = text.match(/([\d]+(?:\.\d+)?)\s*([a-z]+)/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const rawUnit = match[2].toLowerCase();
  const unit = unitMap[rawUnit] || rawUnit;
  if (isNaN(amount) || amount <= 0) return null;
  return { amount, unit, raw: text.trim() };
}

/**
 * Normalize date text → { display: String, year: Number, month: Number|null }
 * e.g. "Mfg: Jan 2025", "04/2025", "2025-01" → { display: 'Jan 2025', year: 2025, month: 1 }
 */
function normalizeDate(text) {
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  // Try "Mon YYYY" or "Mon/YYYY"
  const m1 = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s./-](\d{4})\b/i);
  if (m1) {
    const month = MONTHS[m1[1].toLowerCase().slice(0, 3)];
    return { display: `${m1[1].slice(0, 3).toUpperCase()} ${m1[2]}`, year: parseInt(m1[2]), month, raw: text.trim() };
  }
  // Try MM/YYYY or MM-YYYY
  const m2 = text.match(/\b(\d{2})[/.-](\d{4})\b/);
  if (m2) {
    const month = parseInt(m2[1]);
    return { display: `${m2[1]}/${m2[2]}`, year: parseInt(m2[2]), month, raw: text.trim() };
  }
  // Try YYYY-MM
  const m3 = text.match(/\b(\d{4})[/.-](\d{2})\b/);
  if (m3) {
    const year = parseInt(m3[1]);
    const month = parseInt(m3[2]);
    return { display: `${m3[2]}/${m3[1]}`, year, month, raw: text.trim() };
  }
  return { display: text.trim(), year: null, month: null, raw: text.trim() };
}

/**
 * Convert EasyOCR quad (4 corner points [[x,y],...]) → {x, y, width, height}
 */
function quadToBbox(quad) {
  if (!quad || !Array.isArray(quad) || quad.length < 2) return null;
  const xs = quad.map((p) => (Array.isArray(p) ? p[0] : p.x || 0));
  const ys = quad.map((p) => (Array.isArray(p) ? p[1] : p.y || 0));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  return { x, y, width, height };
}

// ── Field extraction rules ───────────────────────────────────────────────────

const EXTRACTORS = [
  // MRP
  {
    key: 'mrp',
    test: (line) => /m\.?r\.?p|maximum retail price|₹\s*\d|rs\.?\s*\d/i.test(line.text),
    extract: (line) => ({
      rawValue: line.text,
      normalizedValue: normalizeMRP(line.text),
      unit: 'INR',
    }),
  },
  // Net Quantity
  {
    key: 'netQuantity',
    test: (line) =>
      /net\s*(qty|quantity|wt|weight|content|vol|volume)|(\d+\s*(g|gm|gms|kg|ml|l|liter|litre|gram|kilogram|pieces|pcs))\b/i.test(
        line.text
      ),
    extract: (line) => {
      const n = normalizeNetQuantity(line.text);
      return { rawValue: line.text, normalizedValue: n, unit: n?.unit };
    },
  },
  // Manufacturer
  {
    key: 'manufacturer',
    test: (line) => /manufactured by|marketed by|packed by|mfg\.?\s*by|mfd\s*by|packaged by|distributed by/i.test(line.text),
    extract: (line) => ({ rawValue: line.text, normalizedValue: { name: line.text.trim() } }),
  },
  // Importer
  {
    key: 'importer',
    test: (line) => /imported by|sole importer|authorised importer|importer:/i.test(line.text),
    extract: (line) => ({ rawValue: line.text, normalizedValue: { name: line.text.trim() } }),
  },
  // Country of Origin
  {
    key: 'countryOfOrigin',
    test: (line) => /country of origin|made in|product of|manufactured in/i.test(line.text),
    extract: (line) => {
      const m = line.text.match(/(?:country of origin|made in|product of|manufactured in)[:\s]+([A-Za-z\s]+)/i);
      return { rawValue: line.text, normalizedValue: { country: m ? m[1].trim() : line.text.trim() } };
    },
  },
  // Mfg Date
  {
    key: 'mfgDate',
    test: (line) => /mfg\.?\s*date|mfd|mfg\.|manufactured on|packed on|packaging date|mfg:|mfd:/i.test(line.text),
    extract: (line) => ({ rawValue: line.text, normalizedValue: normalizeDate(line.text) }),
  },
  // Best Before / Expiry
  {
    key: 'bestBefore',
    test: (line) => /best before|use by|expiry|exp\.?\s*date|exp:|best before end|use before|bb:/i.test(line.text),
    extract: (line) => ({ rawValue: line.text, normalizedValue: normalizeDate(line.text) }),
  },
  // Consumer Care
  {
    key: 'consumerCare',
    test: (line) => /consumer care|customer care|for complaints|helpline|1800|toll.?free|grievance/i.test(line.text),
    extract: (line) => ({ rawValue: line.text, normalizedValue: { contact: line.text.trim() } }),
  },
  // Consumer Care Email
  {
    key: 'consumerCareEmail',
    test: (line) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(line.text),
    extract: (line) => {
      const m = line.text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      return { rawValue: line.text, normalizedValue: { email: m ? m[1] : line.text.trim() } };
    },
  },
  // Batch/Lot Number
  {
    key: 'batchNumber',
    test: (line) => /batch\s*no|batch\s*number|lot\s*no|lot\s*number|batch:|lot:|b\.no|l\.no|code no/i.test(line.text),
    extract: (line) => {
      const m = line.text.match(/(?:batch|lot|b\.no|l\.no|code no)[:\s#.]+([A-Za-z0-9\-\/]+)/i);
      return { rawValue: line.text, normalizedValue: { number: m ? m[1].trim() : line.text.trim() } };
    },
  },
  // FSSAI
  {
    key: 'fssaiLicense',
    test: (line) => /fssai|lic\.?\s*no|licence no|license no/i.test(line.text) || /\b[0-9]{14}\b/.test(line.text),
    extract: (line) => {
      const m = line.text.match(/([0-9]{14})/);
      return {
        rawValue: line.text,
        normalizedValue: { licenseNumber: m ? m[1] : line.text.replace(/[^0-9]/g, '').slice(0, 14) },
      };
    },
  },
  // Unit Sale Price
  {
    key: 'unitSalePrice',
    test: (line) => /per\s*(kg|litre|liter|gm|ml|piece|unit)|unit\s*price|price\s*per/i.test(line.text),
    extract: (line) => ({ rawValue: line.text, normalizedValue: { description: line.text.trim() } }),
  },
];

// ── Main extractor function ───────────────────────────────────────────────────

/**
 * Extract declarations from an array of OCR lines across all images.
 *
 * @param {Array} ocrLinesByImage - Array of { imageId, lines: [{text, confidence, box}] }
 * @returns {Array} extractedFields - Array of field objects ready to store
 */
function extractDeclarations(ocrLinesByImage) {
  const fields = [];
  const foundKeys = new Set();

  for (const { imageId, lines } of ocrLinesByImage) {
    for (const line of lines) {
      if (!line.text || typeof line.text !== 'string') continue;
      if (line.confidence < 0.2) continue; // ignore extremely low confidence

      for (const extractor of EXTRACTORS) {
        // If we already found a higher-confidence match for this key, skip
        const existingIdx = fields.findIndex((f) => f.fieldKey === extractor.key);
        if (existingIdx >= 0 && fields[existingIdx].confidence >= line.confidence) continue;

        if (extractor.test(line)) {
          const extracted = extractor.extract(line);
          if (!extracted || extracted.normalizedValue === null) continue;

          const bbox = quadToBbox(line.box);
          const field = {
            fieldKey: extractor.key,
            rawValue: extracted.rawValue,
            normalizedValue: extracted.normalizedValue,
            unit: extracted.unit || null,
            confidence: line.confidence,
            imageId: imageId || null,
            bbox,
            quad: line.box,
            source: 'pattern',
          };

          if (existingIdx >= 0) {
            // Replace with higher confidence match
            fields[existingIdx] = field;
          } else {
            fields.push(field);
            foundKeys.add(extractor.key);
          }
        }
      }
    }
  }

  return fields;
}

module.exports = { extractDeclarations, normalizeMRP, normalizeNetQuantity, normalizeDate, CONFIDENCE_THRESHOLD };
