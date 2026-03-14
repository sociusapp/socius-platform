import { api } from './client';

const getHelpCategories = () => {
  return api.get('/help-categories').then((r) => r.data);
};

export { getHelpCategories };
