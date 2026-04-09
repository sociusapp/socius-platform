import { api } from './client';

const getHelpCategories = () => {
  return api.get('/help-categories').then((r) => r.data);
};

const getHelpSubcategories = ({ categoryId, categorySlug } = {}) => {
  return api
    .get('/help-categories/subcategories', {
      params: {
        ...(categoryId ? { categoryId } : {}),
        ...(categorySlug ? { categorySlug } : {}),
      },
      cacheTtlMs: 30 * 1000,
    })
    .then((r) => r.data);
};

export { getHelpCategories, getHelpSubcategories };
