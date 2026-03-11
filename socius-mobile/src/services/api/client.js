import axios from 'axios';

const LIVE_API = 'https://socius-platform-rxjo.onrender.com/api';

const normalizeUrl = (value) => String(value || '').trim();

const isPrivateHostname = (hostname) => {
  const host = String(hostname || '').toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.local')) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  const match172 = /^172\.(\d+)\.\d+\.\d+$/.exec(host);
  if (match172) {
    const second = Number(match172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
};

const isPrivateApiUrl = (url) => {
  try {
    const u = new URL(url);
    return isPrivateHostname(u.hostname);
  } catch (e) {
    return false;
  }
};

const ENV_API = normalizeUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

let baseURL = LIVE_API;
if (ENV_API) {
  if (__DEV__) {
    baseURL = ENV_API;
  } else {
    baseURL = isPrivateApiUrl(ENV_API) ? LIVE_API : ENV_API;
  }
}

console.log(`API Base URL (${__DEV__ ? 'DEV' : 'PRODUCTION'}):`, baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { api, baseURL };
