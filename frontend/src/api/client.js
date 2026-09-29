/**
 * api/client.js
 * Central axios instance — reads VITE_API_URL from environment.
 * All API modules should import from here rather than hardcoding URLs.
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({ baseURL: BASE_URL });

// Attach JWT token automatically to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Standardize error messages
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'An unexpected error occurred';
    err.displayMessage = msg;
    return Promise.reject(err);
  }
);

export default client;
export { BASE_URL };
