import { api } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const getPendingVerifications = (token, params) => {
  return api
    .get('/admin/verifications', { ...(authConfig(token) || {}), params })
    .then((response) => response.data);
};

const approveVerification = (token, userId) => {
  return api
    .patch(`/admin/verifications/${encodeURIComponent(userId)}/approve`, undefined, authConfig(token))
    .then((response) => response.data);
};

const rejectVerification = (token, userId, payload) => {
  return api
    .patch(`/admin/verifications/${encodeURIComponent(userId)}/reject`, payload, authConfig(token))
    .then((response) => response.data);
};

const getUsers = (token, params) => {
  return api
    .get('/admin/users', { ...(authConfig(token) || {}), params })
    .then((response) => response.data);
};

const limitAccount = (token, userId, reason) => {
  return api
    .patch(
      `/admin/users/${encodeURIComponent(userId)}/limit`,
      reason ? { reason } : undefined,
      authConfig(token)
    )
    .then((response) => response.data);
};

const restoreAccount = (token, userId) => {
  return api
    .patch(`/admin/users/${encodeURIComponent(userId)}/restore`, undefined, authConfig(token))
    .then((response) => response.data);
};

const suspendAccount = (token, userId, reason) => {
  return api
    .patch(
      `/admin/users/${encodeURIComponent(userId)}/suspend`,
      reason ? { reason } : undefined,
      authConfig(token)
    )
    .then((response) => response.data);
};

const awardBadge = (token, userId, payload) => {
  return api
    .post(`/admin/users/${encodeURIComponent(userId)}/badges`, payload, authConfig(token))
    .then((response) => response.data);
};

const revokeUserBadge = (token, userId) => {
  return api
    .delete(`/admin/users/${encodeURIComponent(userId)}/badges`, authConfig(token))
    .then((response) => response.data);
};

const getReports = (token, params) => {
  return api
    .get('/admin/reports', { ...(authConfig(token) || {}), params })
    .then((response) => response.data);
};

const resolveReport = (token, reportId, payload) => {
  return api
    .patch(
      `/admin/reports/${encodeURIComponent(reportId)}/resolve`,
      payload,
      authConfig(token)
    )
    .then((response) => response.data);
};

export {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getUsers,
  limitAccount,
  restoreAccount,
  suspendAccount,
  awardBadge,
  revokeUserBadge,
  getReports,
  resolveReport,
};
