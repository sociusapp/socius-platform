import { api } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const unwrapAxios = (axiosRes) => {
  const body = axiosRes?.data;
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data;
  }
  return body;
};

export const getCommunitySurveyQuestions = async (token) => {
  const res = await api.get('/community-survey/questions', authConfig(token));
  return unwrapAxios(res) || { items: [] };
};

export const postCommunitySurveyVote = async (token, payload) => {
  const res = await api.post('/community-survey/vote', payload, authConfig(token));
  return unwrapAxios(res);
};
