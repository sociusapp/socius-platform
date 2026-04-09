import { api, baseURL } from './client';

/** API envelope `{ success, data }` from socius-backend */
const unwrap = (body) => {
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data;
  }
  return body;
};

const unwrapAxios = (r) => unwrap(r?.data);

export const blogTypeApi = {
  getAll: () => api.get('/blog-types').then(unwrapAxios),
  getById: (id) => api.get(`/blog-types/${id}`).then(unwrapAxios),
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
    }).then(unwrapAxios);
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
    }).then(unwrapAxios);
  },
  delete: (id) => api.delete(`/blog-types/${id}`).then(unwrapAxios),
};

export const blogApi = {
  getAll: (params) => api.get('/blogs', { params }).then(unwrapAxios),
  getById: (id) => api.get(`/blogs/admin/${id}`).then(unwrapAxios),
  getBySlug: (slug) => api.get(`/blogs/public/slug/${slug}`).then(unwrapAxios),
  getByType: (typeId, params) => api.get(`/blogs/public/type/${typeId}`, { params }).then(unwrapAxios),
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
    }).then(unwrapAxios);
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
    }).then(unwrapAxios);
  },
  delete: (id) => api.delete(`/blogs/${id}`).then(unwrapAxios),
};

export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = baseURL.replace(/\/api\/?$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};
