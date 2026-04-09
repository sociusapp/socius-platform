import { api } from './client';

export const getHelpSubcategoriesAdmin = async (params = {}) => {
  const res = await api.get('/admin/help-subcategories', { params });
  return res.data;
};

export const createHelpSubcategoryAdmin = async (payload) => {
  const res = await api.post('/admin/help-subcategories', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data;
};

export const updateHelpSubcategoryAdmin = async (id, payload) => {
  const res = await api.patch(`/admin/help-subcategories/${id}`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data;
};

export const deleteHelpSubcategoryAdmin = async (id) => {
  const res = await api.delete(`/admin/help-subcategories/${id}`);
  return res.data;
};
