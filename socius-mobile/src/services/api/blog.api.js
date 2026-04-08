import { api } from './client';

const normalizeResponse = (res) => {
  if (res?.data?.items !== undefined) return { items: res.data.items };
  if (res?.items !== undefined) return { items: res.items };
  if (Array.isArray(res)) return { items: res };
  return { items: [] };
};

// Get active blog types for public display
export const getBlogTypes = async () => {
  try {
    const response = await api.get('/blog-types/public');
    return normalizeResponse(response);
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
    return {
      items: response.data?.items || [],
      pagination: response.data?.pagination || {}
    };
  } catch (error) {
    console.error('Error fetching blogs by type:', error);
    return { items: [] };
  }
};

// Get blog by slug
export const getBlogBySlug = async (slug) => {
  try {
    const response = await api.get(`/blogs/public/slug/${slug}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
};
