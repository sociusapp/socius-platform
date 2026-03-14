import { api } from './client';

export const getHelpCategoriesAdmin = async () => {
  const res = await api.get('/admin/help-categories');
  return res.data;
};

export const createHelpCategoryAdmin = async (formData) => {
  const res = await api.post('/admin/help-categories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateHelpCategoryAdmin = async (id, formData) => {
  const res = await api.put(`/admin/help-categories/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const deleteHelpCategoryAdmin = async (id) => {
  const res = await api.delete(`/admin/help-categories/${id}`);
  return res.data;
};
