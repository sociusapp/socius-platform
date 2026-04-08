import { api } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const getMyActiveHelpRequest = (token) => {
  return api
    .get('/help-request/active', authConfig(token))
    .then((response) => response.data);
};

const getHelpRequestById = (token, id, options = {}) => {
  const cacheTtlMs =
    typeof options?.cacheTtlMs === 'number' ? options.cacheTtlMs : 15000;
  return api
    .get(`/help-request/${encodeURIComponent(id)}`, { ...authConfig(token), cacheTtlMs })
    .then((response) => response.data);
};

const createHelpRequest = (token, payload) => {
  return api
    .post('/help-request', payload, authConfig(token))
    .then((response) => response.data);
};

const updateHelpRequest = (token, id, payload) => {
  return api
    .patch(`/help-request/${encodeURIComponent(id)}`, payload, authConfig(token))
    .then((response) => response.data);
};

const acceptHelpRequest = (token, id) => {
  return api
    .patch(`/help-request/${encodeURIComponent(id)}/accept`, undefined, authConfig(token))
    .then((response) => response.data);
};

const declineHelpRequest = (token, id) => {
  return api
    .patch(`/help-request/${encodeURIComponent(id)}/decline`, undefined, authConfig(token))
    .then((response) => response.data);
};

const cancelHelpRequest = (token, id, payload) => {
  return api
    .patch(`/help-request/${encodeURIComponent(id)}/cancel`, payload, authConfig(token))
    .then((response) => response.data);
};

const closeHelpRequest = (token, id, payload) => {
  return api
    .patch(`/help-request/${encodeURIComponent(id)}/close`, payload, authConfig(token))
    .then((response) => response.data);
};

/** Requester: extend session window or quick-complete (from completion prompt) */
const patchHelpSession = (token, id, body) => {
  return api
    .patch(`/help-request/${encodeURIComponent(id)}/session`, body, authConfig(token))
    .then((response) => response.data);
};

const markRequestDelivered = (token, id) => {
  return api
    .patch(`/help-request/${encodeURIComponent(id)}/delivered`, undefined, authConfig(token))
    .then((response) => response.data);
};

// New closure flow
const submitClosure = (token, payload) => {
  return api
    .post('/request/close', payload, authConfig(token))
    .then((response) => response.data);
};

const getClosureFeedback = (token, requestId) => {
  return api
    .get(`/request/closure-feedback/${encodeURIComponent(requestId)}`, { ...authConfig(token), cacheTtlMs: 15000 })
    .then((response) => response.data);
};

const finalizeClosure = (token, payload) => {
  return api
    .put('/request/finalize-closure', payload, authConfig(token))
    .then((response) => response.data);
};

const uploadClosureEvidence = (token, formData) => {
  const cfg = {
    ...authConfig(token),
    headers: {
      ...(authConfig(token)?.headers || {}),
      'Content-Type': 'multipart/form-data',
    },
  };
  return api.post('/closure-upload', formData, cfg).then((r) => r.data);
};

const getNearbyHelpRequests = (token, coords) => {
  const params = coords ? { latitude: coords.latitude, longitude: coords.longitude } : {};
  return api
    .get('/help-request/nearby', { ...authConfig(token), params, cacheTtlMs: 5000 })
    .then((response) => response.data);
};

const getNearbyPresenceRequests = (token, coords) => {
  const params = coords ? { lat: coords.latitude, lng: coords.longitude } : {};
  return api
    .get('/presence/nearby', { ...authConfig(token), params, cacheTtlMs: 5000 })
    .then((response) => response.data);
};

const getActivePresenceRequest = (token) => {
  return api
    .get('/presence/active', { ...authConfig(token) })
    .then((response) => response.data);
};

const getPresenceById = (token, id) => {
  return api
    .get(`/presence/${encodeURIComponent(id)}`, { ...authConfig(token), cacheTtlMs: 5000 })
    .then((response) => response.data);
};

const createPresenceRequest = (token, payload) => {
  return api
    .post('/presence', payload, authConfig(token))
    .then((response) => response.data);
};

const updatePresenceRequest = (token, id, payload) => {
  return api
    .patch(`/presence/${encodeURIComponent(id)}`, payload, authConfig(token))
    .then((response) => response.data);
};

const updateAvailabilityLocation = (token, payload) => {
  return api
    .patch('/availability/location', payload, authConfig(token))
    .then((response) => response.data);
};

const toggleAvailability = (token, payload) => {
  return api
    .patch('/availability/toggle', payload, authConfig(token))
    .then((response) => response.data);
};

const acceptPresence = (token, id) => {
  return api
    .patch(`/presence/${encodeURIComponent(id)}/accept`, undefined, authConfig(token))
    .then((response) => response.data);
};

const updatePresenceStatus = (token, id, status) => {
  return api
    .patch(`/presence/${encodeURIComponent(id)}/status`, { status }, authConfig(token))
    .then((response) => response.data);
};

const declinePresence = (token, id) => {
  return api
    .patch(`/presence/${encodeURIComponent(id)}/decline`, undefined, authConfig(token))
    .then((response) => response.data);
};

const cancelPresenceRequest = (token, id, payload) => {
  return api
    .patch(`/presence/${encodeURIComponent(id)}/cancel`, payload, authConfig(token))
    .then((response) => response.data);
};

const closePresenceRequest = (token, id) => {
  return api
    .patch(`/presence/${encodeURIComponent(id)}/close`, undefined, authConfig(token))
    .then((response) => response.data);
};

export {
  getMyActiveHelpRequest,
  getHelpRequestById,
  createHelpRequest,
  updateHelpRequest,
  acceptHelpRequest,
  declineHelpRequest,
  cancelHelpRequest,
  closeHelpRequest,
  patchHelpSession,
  markRequestDelivered,
  submitClosure,
  getClosureFeedback,
  finalizeClosure,
  uploadClosureEvidence,
  getNearbyHelpRequests,
  getNearbyPresenceRequests,
  getActivePresenceRequest,
  getPresenceById,
  createPresenceRequest,
  updatePresenceRequest,
  updateAvailabilityLocation,
  toggleAvailability,
  acceptPresence,
  updatePresenceStatus,
  declinePresence,
  cancelPresenceRequest,
  closePresenceRequest,
};
