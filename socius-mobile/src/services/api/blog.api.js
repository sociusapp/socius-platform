import { api, baseURL } from './client';

/** Backend sends `{ success, message, data }` — unwrap for callers. */
const unwrap = (axiosResponse) => {
  const body = axiosResponse?.data;
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data;
  }
  return body;
};

export const getPublicMediaUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const root = String(baseURL || '').replace(/\/api\/?$/, '');
  return `${root}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Get active blog types for public display
export const getBlogTypes = async () => {
  try {
    const response = await api.get('/blog-types/public');
    const data = unwrap(response);
    if (data?.items !== undefined) return { items: Array.isArray(data.items) ? data.items : [] };
    if (Array.isArray(data)) return { items: data };
    return { items: [] };
  } catch (error) {
    console.error('Error fetching blog types:', error);
    return { items: [] };
  }
};

// Get blogs by type
export const getBlogsByType = async (typeId, page = 1, limit = 10) => {
  try {
    const response = await api.get(`/blogs/public/type/${typeId}`, {
      params: { page, limit }
    });
    const data = unwrap(response) || {};
    const pagination = data.pagination || {};
    const pg = Number(pagination.page) || 1;
    const pages = Number(pagination.pages) || 1;
    return {
      items: data.items || [],
      pagination: {
        ...pagination,
        hasMore: pg < pages,
      },
    };
  } catch (error) {
    console.error('Error fetching blogs by type:', error);
    return { items: [], pagination: {} };
  }
};

// Get blog by slug
export const getBlogBySlug = async (slug) => {
  try {
    const response = await api.get(`/blogs/public/slug/${encodeURIComponent(slug)}`);
    const data = unwrap(response);
    return data && typeof data === 'object' ? data : null;
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
};
