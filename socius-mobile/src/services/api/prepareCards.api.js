import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

const CACHE_KEY = '@socius_prepare_cards_v1';

/**
 * GET /prepare-cards — JSON array [{ id, title, description, image_url, position, is_active, ... }]
 */
export const fetchPrepareCards = async () => {
  const { data } = await api.get('/prepare-cards', { cacheTtlMs: 60 * 1000 });
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const fetchPrepareCardById = async (id) => {
  const { data } = await api.get(`/prepare-cards/${encodeURIComponent(id)}`, { cacheTtlMs: 30 * 1000 });
  return data;
};

export const savePrepareCardsCache = async (items) => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: items })
    );
  } catch {
    /* ignore */
  }
};

export const loadPrepareCardsCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.data)) {
      return { ts: parsed.ts, data: parsed.data };
    }
  } catch {
    /* ignore */
  }
  return null;
};
