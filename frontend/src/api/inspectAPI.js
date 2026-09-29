/**
 * api/inspectAPI.js
 * Legacy single-image inspection API — kept for backward compatibility with
 * the old CheckPage / UploadScreen flow.
 */
import client from './client';
import { BASE_URL } from './client';

export async function inspectImage(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  const response = await client.post('/api/inspect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getHistory() {
  const response = await client.get('/api/history');
  return response.data;
}

export async function verifyInspection(id, decision) {
  const response = await client.patch(`/api/inspect/${id}/verify`, { decision });
  return response.data;
}

export async function clearHistory() {
  const response = await client.delete('/api/history');
  return response.data;
}

export function getReportUrl(inspectionId) {
  return `${BASE_URL}/api/inspect/${inspectionId}/report`;
}
