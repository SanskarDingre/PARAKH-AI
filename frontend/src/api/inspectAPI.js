import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function inspectImage(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  const response = await axios.post(`${BASE_URL}/api/inspect`, formData, {
    headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() },
  });
  return response.data;
}

export async function getHistory() {
  const response = await axios.get(`${BASE_URL}/api/history`, { headers: authHeaders() });
  return response.data;
}

export async function verifyInspection(id, decision) {
  const response = await axios.patch(`${BASE_URL}/api/inspect/${id}/verify`, { decision }, { headers: authHeaders() });
  return response.data;
}

export async function clearHistory() {
  const response = await axios.delete(`${BASE_URL}/api/history`, { headers: authHeaders() });
  return response.data;
}
