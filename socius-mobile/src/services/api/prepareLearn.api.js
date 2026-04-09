import { api } from './client';

/**
 * GET /prepare-cards/learn-more — same prefix as topic cards (works on older gateways).
 * Response: { section_title, footer_text, items: [{ id, label, icon, navigate_to }] }
 */
export const fetchPrepareLearn = async () => {
  const { data } = await api.get('/prepare-cards/learn-more', { cacheTtlMs: 60 * 1000 });
  return data && typeof data === 'object' ? data : null;
};
