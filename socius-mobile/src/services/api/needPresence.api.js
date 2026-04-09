import { api } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const createPresenceRequest = (token, payload) =>
  api.post('/presence', payload, authConfig(token)).then((response) => response.data);

const getActivePresenceRequest = (token) =>
  api.get('/presence/active', authConfig(token)).then((response) => response.data);

const getPresenceById = (token, id) =>
  api
    .get(`/presence/${encodeURIComponent(id)}`, { ...authConfig(token), cacheTtlMs: 5000 })
    .then((response) => response.data);

const acceptPresence = (token, id) =>
  api
    .patch(`/presence/${encodeURIComponent(id)}/accept`, undefined, authConfig(token))
    .then((response) => response.data);

const declinePresence = (token, id) =>
  api
    .patch(`/presence/${encodeURIComponent(id)}/decline`, undefined, authConfig(token))
    .then((response) => response.data);

const updatePresenceRequest = (token, id, payload) =>
  api
    .patch(`/presence/${encodeURIComponent(id)}`, payload, authConfig(token))
    .then((response) => response.data);

const updatePresenceStatus = (token, id, status) =>
  api
    .patch(`/presence/${encodeURIComponent(id)}/status`, { status }, authConfig(token))
    .then((response) => response.data);

const cancelPresenceRequest = (token, id, payload) =>
  api
    .patch(`/presence/${encodeURIComponent(id)}/cancel`, payload, authConfig(token))
    .then((response) => response.data);

const closePresenceRequest = (token, id) =>
  api
    .patch(`/presence/${encodeURIComponent(id)}/close`, undefined, authConfig(token))
    .then((response) => response.data);

const submitClosure = (token, payload) =>
  api.post('/request/close', payload, authConfig(token)).then((response) => response.data);

const getPresenceCategories = (token, options = {}) =>
  api
    .get('/presence/categories', {
      ...authConfig(token),
      cacheTtlMs: options.cacheTtlMs ?? 60 * 1000,
    })
    .then((response) => response.data);

const getPresenceItems = (token, categoryId, options = {}) =>
  api
    .get('/presence/items', {
      ...authConfig(token),
      params: categoryId ? { categoryId } : undefined,
      cacheTtlMs: options.cacheTtlMs ?? 30 * 1000,
    })
    .then((response) => response.data);

export {
  createPresenceRequest,
  getActivePresenceRequest,
  getPresenceById,
  acceptPresence,
  declinePresence,
  updatePresenceRequest,
  updatePresenceStatus,
  cancelPresenceRequest,
  closePresenceRequest,
  submitClosure,
  getPresenceCategories,
  getPresenceItems,
};

