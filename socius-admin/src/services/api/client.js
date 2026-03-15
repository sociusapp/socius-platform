import axios from 'axios';

const LOCAL_API = process.env.REACT_APP_SOCIUS_API_BASE || 'http://127.0.0.1:48080/api';
const LIVE_API = process.env.REACT_APP_SOCIUS_LIVE_API || 'https://socius-platform-rxjo.onrender.com/api';

const isProduction = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');
const issueTrackerForceLive = String(process.env.REACT_APP_ISSUE_TRACKER_FORCE_LIVE || '').toLowerCase() === 'true';
let baseURL = isProduction ? LIVE_API : LOCAL_API;
let issueTrackerBaseURL = issueTrackerForceLive ? LIVE_API : baseURL;

try {
  const u = new URL(baseURL);
  if (u.hostname === '0.0.0.0') {
    u.hostname = '127.0.0.1';
    baseURL = u.toString();
  }
} catch { }

try {
  const u = new URL(issueTrackerBaseURL);
  if (u.hostname === '0.0.0.0') {
    u.hostname = '127.0.0.1';
    issueTrackerBaseURL = u.toString();
  }
} catch { }

console.log(`Admin API URL (${isProduction ? 'LIVE' : 'LOCAL'}):`, baseURL);
console.log(`Issue Tracker API URL (${issueTrackerForceLive ? 'LIVE' : isProduction ? 'LIVE' : 'LOCAL'}):`, issueTrackerBaseURL);

const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });
const issueTrackerApi = axios.create({ baseURL: issueTrackerBaseURL, headers: { 'Content-Type': 'application/json' } });

const ISSUE_TRACKER_TOKEN_KEY = 'socius_issue_tracker_token';

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

const attachIssueTrackerAuth = (instance) => {
  instance.interceptors.request.use((config) => {
    try {
      const token =
        (typeof localStorage !== 'undefined' && localStorage.getItem(ISSUE_TRACKER_TOKEN_KEY)) ||
        null;

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      }
    } catch { }

    return config;
  });
};

attachAuth(api);
attachAuth(issueTrackerApi);
attachIssueTrackerAuth(issueTrackerApi);

export { api, baseURL, issueTrackerApi, issueTrackerBaseURL, ISSUE_TRACKER_TOKEN_KEY };
