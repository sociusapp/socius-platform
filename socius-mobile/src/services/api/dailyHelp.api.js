import { api } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const getMyActiveHelpRequest = (token) =>
  api.get('/help-request/active', authConfig(token)).then((response) => response.data);

const getHelpRequestById = (token, id, options = {}) => {
  const cacheTtlMs =
    typeof options?.cacheTtlMs === 'number' ? options.cacheTtlMs : 15000;
  return api
    .get(`/help-request/${encodeURIComponent(id)}`, { ...authConfig(token), cacheTtlMs })
    .then((response) => response.data);
};

const createHelpRequest = (token, payload) =>
  api.post('/help-request', payload, authConfig(token)).then((response) => response.data);

const updateHelpRequest = (token, id, payload) =>
  api
    .patch(`/help-request/${encodeURIComponent(id)}`, payload, authConfig(token))
    .then((response) => response.data);

const acceptHelpRequest = (token, id) =>
  api
    .patch(`/help-request/${encodeURIComponent(id)}/accept`, undefined, authConfig(token))
    .then((response) => response.data);

const cancelHelpRequest = (token, id, payload) =>
  api
    .patch(`/help-request/${encodeURIComponent(id)}/cancel`, payload, authConfig(token))
    .then((response) => response.data);

const closeHelpRequest = (token, id, payload) =>
  api
    .patch(`/help-request/${encodeURIComponent(id)}/close`, payload, authConfig(token))
    .then((response) => response.data);

const getNearbyHelpRequests = (token, coords) => {
  const params = coords ? { latitude: coords.latitude, longitude: coords.longitude } : {};
  return api
    .get('/help-request/nearby', { ...authConfig(token), params, cacheTtlMs: 5000 })
    .then((response) => response.data);
};

const submitClosure = (token, payload) =>
  api.post('/request/close', payload, authConfig(token)).then((response) => response.data);

const createBorrowItemRequest = (token, requestId, payload) =>
  api
    .post(`/help-request/${encodeURIComponent(requestId)}/borrow`, payload, authConfig(token))
    .then((response) => response.data);

const getBorrowItems = (token, requestId) =>
  api
    .get(`/help-request/${encodeURIComponent(requestId)}/borrow-items`, authConfig(token))
    .then((response) => response.data);

const respondBorrowItemRequest = (token, requestId, borrowId, action) =>
  api
    .patch(
      `/help-request/${encodeURIComponent(requestId)}/borrow/${encodeURIComponent(borrowId)}`,
      { action },
      authConfig(token)
    )
    .then((response) => response.data);

const getHelpCatalogItems = (token, { categoryId, categorySlug } = {}, options = {}) =>
  api
    .get('/help-categories/items', {
      ...authConfig(token),
      params: {
        ...(categoryId ? { categoryId } : {}),
        ...(categorySlug ? { categorySlug } : {}),
      },
      cacheTtlMs: options.cacheTtlMs ?? 30 * 1000,
    })
    .then((response) => response.data);

export {
  getMyActiveHelpRequest,
  getHelpRequestById,
  createHelpRequest,
  updateHelpRequest,
  acceptHelpRequest,
  cancelHelpRequest,
  closeHelpRequest,
  getNearbyHelpRequests,
  submitClosure,
  getHelpCatalogItems,
  createBorrowItemRequest,
  getBorrowItems,
  respondBorrowItemRequest,
};

