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
  return api.get('/user/profile', { ...authConfig(token), cacheTtlMs: 10000 }).then((response) => response.data);
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

 export { getHome, getProfile, updateProfile, markFirstTimeFlag, deleteAccount, getHistory, getEmergencyContacts, upsertEmergencyContacts, deleteEmergencyContact };
