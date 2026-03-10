import { api } from './client';

export const getStaticPages = async () => {
  const response = await api.get('/pages');
  return response.data;
};

export const getStaticPageBySlug = async (slug) => {
  const response = await api.get(`/pages/${slug}`);
  return response.data;
};

export const createStaticPage = async (data) => {
  const response = await api.post('/pages', data);
  return response.data;
};

export const updateStaticPage = async (slug, data) => {
  const response = await api.put(`/pages/${slug}`, data);
  return response.data;
};
