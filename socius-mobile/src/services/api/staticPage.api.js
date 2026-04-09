import { api } from './client';

export const getStaticPageBySlug = async (slug) => {
  try {
    const response = await api.get(`/pages/${slug}`);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    if (__DEV__) {
      if (status === 404) {
        console.warn(`[staticPage] No page in CMS for slug "${slug}" (404). Run backend: npm run seed:static-pages`);
      } else {
        console.error('Error fetching static page:', error?.message || error);
      }
    }
    return { success: false, message: error?.message || 'Request failed', status };
  }
};
