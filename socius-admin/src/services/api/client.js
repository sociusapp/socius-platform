import axios from 'axios';

const LOCAL_DEFAULT = 'http://127.0.0.1:48080/api';
const LIVE_DEFAULT = 'https://socius-platform-rxjo.onrender.com/api';

/**
 * Axios baseURL must include the `/api` path prefix (same as app.use('/api', routes) on the server).
 * If env is set to only `http://host:port`, requests become `/admin/...` instead of `/api/admin/...`
 * and the backend returns "Route not found: GET /admin/...".
 */
const normalizeApiBase = (raw) => {
  const fallback = LOCAL_DEFAULT;
  const s = String(raw || '').trim();
  if (!s) return fallback;
  try {
    const u = new URL(s);
    if (u.hostname === '0.0.0.0') u.hostname = '127.0.0.1';
    const path = (u.pathname || '/').replace(/\/+$/, '') || '';
    if (path === '' || path === '/') {
      u.pathname = '/api';
    }
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '') || fallback;
  } catch {
    return fallback;
  }
};

const LOCAL_API = normalizeApiBase(process.env.REACT_APP_SOCIUS_API_BASE || LOCAL_DEFAULT);
const LIVE_API = normalizeApiBase(process.env.REACT_APP_SOCIUS_LIVE_API || LIVE_DEFAULT);

const isProduction = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');
const baseURL = isProduction ? LIVE_API : LOCAL_API;

const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

/** Same axios instance — Issue Tracker uses the logged-in admin session (no separate base URL or token). */
const issueTrackerApi = api;
const issueTrackerBaseURL = baseURL;

console.log(`Admin API URL (${isProduction ? 'LIVE' : 'LOCAL'}):`, baseURL);

const attachAuth = (instance) => {
  instance.interceptors.request.use((config) => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('socius_user') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.accessToken) {
          config.headers = config.headers || {};
          if (!config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${parsed.accessToken}`;
          }
        }
      }
    } catch { }
    return config;
  });
};

/**
 * The axios instance defaults to Content-Type: application/json. For FormData, the browser must set
 * multipart/form-data including the boundary. If Content-Type stays application/json, multer never
 * sees the file and the API returns "image is required".
 */
const attachFormDataContentTypeFix = (instance) => {
  instance.interceptors.request.use((config) => {
    const data = config.data;
    const isFd =
      (typeof FormData !== 'undefined' && data instanceof FormData) ||
      (data && typeof data.append === 'function' && typeof data.get === 'function');
    if (!isFd) return config;

    const h = config.headers;
    if (!h) return config;
    if (typeof h.delete === 'function') {
      h.delete('Content-Type');
      h.delete('content-type');
    }
    if (typeof h === 'object') {
      delete h['Content-Type'];
      delete h['content-type'];
    }
    return config;
  });
};

attachAuth(api);
attachFormDataContentTypeFix(api);

/**
 * Handle session expiration by clearing storage and redirecting to login
 * @param {number} status - HTTP status code
 */
const handleSessionExpired = (status) => {
  if (status === 401 || status === 403) {
    try {
      localStorage.removeItem('socius_user');
      delete api.defaults.headers.common.Authorization;
    } catch { }

    const isLoginPage = typeof window !== 'undefined' &&
      (window.location.pathname === '/login' ||
       window.location.pathname === '/developer-login');

    if (!isLoginPage) {
      window.location.href = '/login';
    }
  }
};

/**
 * Response interceptor to handle session expiration (401/403)
 * Automatically logs out and redirects to login page
 */
const attachSessionExpiredHandler = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      handleSessionExpired(status);
      return Promise.reject(error);
    }
  );
};

attachSessionExpiredHandler(api);

const getBearer = () => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('socius_user') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.accessToken || null;
  } catch {
    return null;
  }
};

/**
 * Use fetch for multipart so Content-Type is never wrong (axios default JSON header breaks multer).
 * @param {'POST'|'PUT'} method
 * @param {string} path - e.g. `/admin/prepare-cards`
 * @param {FormData} formData
 */
const fetchFormData = async (method, path, formData) => {
  const root = String(baseURL || '').replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${root}${p}`;
  const headers = {};
  const token = getBearer();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method, headers, body: formData });
  const data = await res.json().catch(() => ({}));

  // Handle session expiration for fetch calls
  handleSessionExpired(res.status);

  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
};

export {
  api,
  baseURL,
  issueTrackerApi,
  issueTrackerBaseURL,
  fetchFormData,
  getBearer,
};
