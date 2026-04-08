import { api, baseURL } from './client';

export const blogTypeApi = {
  getAll: () => api.get('/blog-types').then(r => r.data),
  getById: (id) => api.get(`/blog-types/${id}`).then(r => r.data),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'icon' && data[key]) {
        formData.append('icon', data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/blog-types', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'icon' && data[key]) {
        formData.append('icon', data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/blog-types/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  delete: (id) => api.delete(`/blog-types/${id}`).then(r => r.data),
};

export const blogApi = {
  getAll: (params) => api.get('/blogs', { params }).then(r => r.data),
  getById: (id) => api.get(`/blogs/admin/${id}`).then(r => r.data),
  getBySlug: (slug) => api.get(`/blogs/public/slug/${slug}`).then(r => r.data),
  getByType: (typeId, params) => api.get(`/blogs/public/type/${typeId}`, { params }).then(r => r.data),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'featuredImage' && data[key]) {
        formData.append('featuredImage', data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/blogs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'featuredImage' && data[key]) {
        formData.append('featuredImage', data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/blogs/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  delete: (id) => api.delete(`/blogs/${id}`).then(r => r.data),
};

export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = baseURL.replace(/\/api\/?$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};
