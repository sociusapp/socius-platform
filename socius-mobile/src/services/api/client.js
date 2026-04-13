import axios from 'axios';
import { clearAuth } from '../storage/asyncStorage.service';

let logoutHandler = null;
/**
 * Set a callback to be executed when session expires (401/403)
 * This helps avoid circular dependencies between API client and Store/Navigation
 */
export const onSessionExpired = (handler) => {
  logoutHandler = handler;
};

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cacheStore = new Map();
const buildCacheKey = (config) => {
  const method = String(config?.method || 'get').toLowerCase();
  const base = String(config?.baseURL || '');
  const url = String(config?.url || '');
  const params = config?.params ? JSON.stringify(config.params) : '';
  return `${method}:${base}${url}?${params}`;
};

const getCacheEntry = (key) => {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry;
};

const shouldRetry = (error, config) => {
  const method = String(config?.method || '').toLowerCase();
  const allowedMethods = config?.retry?.methods || ['get', 'head', 'options'];
  if (!allowedMethods.includes(method)) return false;

  if (axios.isCancel(error)) return false;

  const status = error?.response?.status;
  const code = String(error?.code || '');

  if (!status) {
    return (
      ['ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT'].includes(code) ||
      String(error?.message || '').toLowerCase().includes('network')
    );
  }

  if (status === 408) return true;
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
};

api.interceptors.request.use(async (config) => {
  const cfg = config || {};

  cfg.metadata = {
    startAt: Date.now(),
  };

  const debugDelayMs = Number(process.env.EXPO_PUBLIC_API_DEBUG_DELAY_MS || 0) || 0;
  if (__DEV__ && debugDelayMs > 0) {
    await sleep(debugDelayMs);
  }

  const method = String(cfg.method || 'get').toLowerCase();
  const cacheTtlMs = Number(cfg.cacheTtlMs || 0) || 0;

  if (method !== 'get' && cacheStore.size > 0) {
    cacheStore.clear();
  }

  if (method === 'get' && cacheTtlMs > 0) {
    const cacheKey = buildCacheKey(cfg);
    const cached = getCacheEntry(cacheKey);
    if (cached) {
      cfg.adapter = async () => ({
        data: cached.data,
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
        config: cfg,
        request: null,
      });
      cfg.__fromCache = true;
      return cfg;
    }
    cfg.__cacheKey = cacheKey;
  }

  cfg.retry = cfg.retry || {};
  if (cfg.retry.retries === undefined) {
    cfg.retry.retries = method === 'get' ? 2 : 0;
  }
  cfg.retry.baseDelayMs = Number(cfg.retry.baseDelayMs || 250) || 250;
  cfg.retry.maxDelayMs = Number(cfg.retry.maxDelayMs || 2000) || 2000;

  return cfg;
});

api.interceptors.response.use(
  (response) => {
    const cfg = response?.config || {};
    const startAt = cfg?.metadata?.startAt;
    const durationMs = typeof startAt === 'number' ? Date.now() - startAt : null;

    if (__DEV__ && durationMs !== null && durationMs > 300) {
      const method = String(cfg.method || '').toUpperCase();
      const url = String(cfg.url || '');
      console.log('[API] slow', `${method} ${url}`, `${durationMs}ms`, cfg.__fromCache ? '(cache)' : '');
    }

    if (cfg.__cacheKey && !cfg.__fromCache) {
      const ttlMs = Number(cfg.cacheTtlMs || 0) || 0;
      if (ttlMs > 0) {
        cacheStore.set(cfg.__cacheKey, {
          expiresAt: Date.now() + ttlMs,
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    }
    return response;
  },
  async (error) => {
    const cfg = error?.config;
    if (!cfg) {
      return Promise.reject(error);
    }

    cfg.__retryCount = Number(cfg.__retryCount || 0) || 0;
    const retries = Number(cfg?.retry?.retries || 0) || 0;

    if (cfg.__retryCount >= retries) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        if (typeof logoutHandler === 'function') {
          void clearAuth().catch(() => {});
          logoutHandler();
        }
      }
      return Promise.reject(error);
    }

    if (!shouldRetry(error, cfg)) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        if (typeof logoutHandler === 'function') {
          void clearAuth().catch(() => {});
          logoutHandler();
        }
      }
      return Promise.reject(error);
    }

    cfg.__retryCount += 1;

    const baseDelayMs = Number(cfg?.retry?.baseDelayMs || 250) || 250;
    const maxDelayMs = Number(cfg?.retry?.maxDelayMs || 2000) || 2000;
    const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, cfg.__retryCount - 1));
    const jitter = Math.floor(Math.random() * 120);
    const delay = exp + jitter;

    if (__DEV__) {
      const method = String(cfg.method || '').toUpperCase();
      const url = String(cfg.url || '');
      console.log('[API] retry', `${method} ${url}`, `#${cfg.__retryCount} in ${delay}ms`);
    }

    await sleep(delay);
    return api(cfg);
  }
);

export { api, baseURL };
