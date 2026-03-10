import axios from 'axios';

const LOCAL_API = process.env.REACT_APP_SOCIUS_API_BASE || 'http://127.0.0.1:48080/api';
const LIVE_API = 'https://socius-platform-rxjo.onrender.com/api';

// Auto-detect production environment based on hostname
const isProduction = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');
const baseURL = isProduction ? LIVE_API : LOCAL_API;

console.log(`Admin API URL (${isProduction ? 'LIVE' : 'LOCAL'}):`, baseURL);

const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

try {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('socius_user') : null;
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed && parsed.accessToken) {
      api.defaults.headers.common.Authorization = `Bearer ${parsed.accessToken}`;
    }
  }
} catch { }
export { api, baseURL };
