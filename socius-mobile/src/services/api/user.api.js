import { api } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const getHome = (token) => {
  return api.get('/user/home', { ...authConfig(token), cacheTtlMs: 15000 }).then((response) => response.data);
};

const getProfile = (token) => {
  return api.get('/user/profile', { ...authConfig(token), cacheTtlMs: 0 }).then((response) => response.data);
};

const updateProfile = (token, payload) => {
  return api
    .put('/user/profile', payload, authConfig(token))
    .then((response) => response.data);
};

const getEmergencyContacts = (token) => {
  return api
    .get('/user/emergency-contacts', { ...authConfig(token), cacheTtlMs: 15000 })
    .then((response) => response.data);
};

const upsertEmergencyContacts = (token, contacts) => {
  return api
    .post('/user/emergency-contacts', { contacts }, authConfig(token))
    .then((response) => response.data);
};

const deleteEmergencyContact = (token, id) => {
  return api
    .delete(`/user/emergency-contacts/${encodeURIComponent(id)}`, authConfig(token))
    .then((response) => response.data);
};
const markFirstTimeFlag = (token, flag) => {
  return api
    .patch(`/user/flags/${encodeURIComponent(flag)}`, undefined, authConfig(token))
    .then((response) => response.data);
};

const deleteAccount = (token) => {
  return api
    .delete('/user/account', authConfig(token))
    .then((response) => response.data);
};

const getHistory = (token, { page = 1, limit = 20 } = {}) => {
  return api
    .get(`/user/history?page=${page}&limit=${limit}`, { ...authConfig(token), cacheTtlMs: 15000 })
    .then((response) => response.data);
};

const getNearbyUsers = (token, { latitude, longitude, radiusMeters = 500 } = {}) => {
  const params = [];
  if (typeof latitude === 'number') params.push(`latitude=${encodeURIComponent(latitude)}`);
  if (typeof longitude === 'number') params.push(`longitude=${encodeURIComponent(longitude)}`);
  if (typeof radiusMeters === 'number') params.push(`radiusMeters=${encodeURIComponent(radiusMeters)}`);
  const query = params.length ? `?${params.join('&')}` : '';
  return api
    .get(`/user/nearby-users${query}`, { ...authConfig(token), cacheTtlMs: 5000 })
    .then((response) => response.data);
};

const getPublicUser = (token, id) => {
  if (!id) return Promise.resolve(null);
  return api
    .get(`/user/public/${encodeURIComponent(id)}`, { ...authConfig(token), cacheTtlMs: 15000 })
    .then((response) => response.data);
};

export {
  getHome,
  getProfile,
  updateProfile,
  markFirstTimeFlag,
  deleteAccount,
  getHistory,
  getEmergencyContacts,
  upsertEmergencyContacts,
  deleteEmergencyContact,
  getNearbyUsers,
  getPublicUser,
};
