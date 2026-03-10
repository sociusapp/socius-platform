import client from './client';

export const getStaticPageBySlug = async (slug) => {
  try {
    const response = await client.get(`/pages/${slug}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching static page:', error);
    return { success: false, message: error.message };
  }
};
