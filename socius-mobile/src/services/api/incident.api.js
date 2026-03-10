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

const getHelpRequestById = (token, id) => {
  return api
    .get(`/help-request/${encodeURIComponent(id)}`, authConfig(token))
    .then((response) => response.data);
};

const createHelpRequest = (token, payload) => {
  return api
    .post('/help-request', payload, authConfig(token))
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

const markRequestDelivered = (token, id) => {
  return api
    .patch(`/help-request/${encodeURIComponent(id)}/delivered`, undefined, authConfig(token))
    .then((response) => response.data);
};

const getNearbyHelpRequests = (token, coords) => {
  const params = coords ? { latitude: coords.latitude, longitude: coords.longitude } : {};
  return api
    .get('/help-request/nearby', { ...authConfig(token), params })
    .then((response) => response.data);
};

const getActivePresenceRequest = (token) => {
  return api
    .get('/presence/active', authConfig(token))
    .then((response) => response.data);
};

const createPresenceRequest = (token, payload) => {
  return api
    .post('/presence', payload, authConfig(token))
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
  acceptHelpRequest,
  declineHelpRequest,
  cancelHelpRequest,
  closeHelpRequest,
  markRequestDelivered,
  getNearbyHelpRequests,
  getActivePresenceRequest,
  createPresenceRequest,
  updateAvailabilityLocation,
  toggleAvailability,
  acceptPresence,
  declinePresence,
  cancelPresenceRequest,
  closePresenceRequest,
};
