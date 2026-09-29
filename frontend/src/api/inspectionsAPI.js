/**
 * api/inspectionsAPI.js
 * API calls for the new multi-image /api/inspections flow.
 */
import client from './client';

/**
 * Create a new empty inspection shell.
 * @param {string} productName - optional product name
 */
export async function createInspection(productName = '') {
  const res = await client.post('/api/inspections', { productName });
  return res.data;
}

/**
 * Upload images to an inspection.
 * @param {string} inspectionId
 * @param {Array<{file: File, label: string}>} images
 * @param {function} onProgress - called with 0-100 progress
 */
export async function uploadImages(inspectionId, images, onProgress) {
  const formData = new FormData();
  const labels = [];
  for (const { file, label } of images) {
    formData.append('images', file);
    labels.push(label);
  }
  formData.append('labels', JSON.stringify(labels));

  const res = await client.post(`/api/inspections/${inspectionId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });
  return res.data;
}

/**
 * Trigger OCR + extraction + rule engine on an inspection.
 * @param {string} inspectionId
 */
export async function analyzeInspection(inspectionId) {
  const res = await client.post(`/api/inspections/${inspectionId}/analyze`);
  return res.data;
}

/**
 * Fetch the full inspection detail with extracted fields and violations.
 */
export async function getInspection(inspectionId) {
  const res = await client.get(`/api/inspections/${inspectionId}`);
  return res.data;
}

/**
 * Fetch image data (with OCR lines) for the evidence viewer.
 */
export async function getInspectionImage(inspectionId, imageId) {
  const res = await client.get(`/api/inspections/${inspectionId}/images/${imageId}`);
  return res.data;
}

/**
 * List inspections with optional search/filter.
 */
export async function listInspections({ search = '', status = 'all', page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (search) params.search = search;
  if (status !== 'all') params.status = status;
  const res = await client.get('/api/inspections', { params });
  return res.data;
}

/**
 * Officer verify or override an inspection.
 */
export async function verifyInspectionNew(inspectionId, decision, note = '') {
  const res = await client.patch(`/api/inspections/${inspectionId}/verify`, { decision, note });
  return res.data;
}

/**
 * Get PDF report URL for an inspection.
 */
export function getReportUrl(inspectionId) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${base}/api/inspections/${inspectionId}/report`;
}
