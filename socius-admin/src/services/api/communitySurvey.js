import { api } from './client';

const unwrap = (body) => {
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data;
  }
  return body;
};

export const communitySurveyAdminApi = {
  list: () => api.get('/admin/community-survey/questions').then((r) => unwrap(r.data)),
  listVotes: (params) =>
    api.get('/admin/community-survey/votes', { params }).then((r) => unwrap(r.data)),
  create: (payload) =>
    api.post('/admin/community-survey/questions', payload).then((r) => unwrap(r.data)),
  update: (id, payload) =>
    api.put(`/admin/community-survey/questions/${id}`, payload).then((r) => unwrap(r.data)),
  delete: (id) =>
    api.delete(`/admin/community-survey/questions/${id}`).then((r) => unwrap(r.data)),
};
