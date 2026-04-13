import btnClickSrc from '../assets/btn-click.wav';

const STORAGE_KEY_UI_CLICK_SOUND = 'socius-admin-ui-click-sound-enabled';
const STORAGE_KEY_UI_CLICK_VOLUME = 'socius-admin-ui-click-sound-volume';

export const ADMIN_UI_CLICK_VOLUME_DEFAULT = 0.05;
export const ADMIN_UI_CLICK_VOLUME_MIN = 0.05;
export const ADMIN_UI_CLICK_VOLUME_MAX = 1;
export const ADMIN_UI_CLICK_VOLUME_STEP = 0.05;

const POOL_SIZE = 6;
let pool = [];
let poolIndex = 0;
let initialized = false;

/**
 * Whether UI click sounds are enabled (stored in localStorage; default on).
 */
export function isAdminUiClickSoundEnabled() {
  try {
    const v = localStorage.getItem(STORAGE_KEY_UI_CLICK_SOUND);
    if (v === null || v === '') return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

/**
 * Persist UI click sound preference and notify listeners (same tab + optional sync).
 */
export function setAdminUiClickSoundEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY_UI_CLICK_SOUND, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent('admin-ui-click-sound-prefs-changed'));
  } catch {
    /* ignore */
  }
}

function clampVolume(v) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = ADMIN_UI_CLICK_VOLUME_DEFAULT;
  n = Math.min(ADMIN_UI_CLICK_VOLUME_MAX, Math.max(ADMIN_UI_CLICK_VOLUME_MIN, n));
  const step = ADMIN_UI_CLICK_VOLUME_STEP;
  const snapped = Math.round(n / step) * step;
  return Math.round(snapped * 100) / 100;
}

/**
 * Current click sound volume (0.05–1), from localStorage; default 0.05 (5%).
 */
export function getAdminUiClickSoundVolume() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UI_CLICK_VOLUME);
    if (raw === null || raw === '') return clampVolume(ADMIN_UI_CLICK_VOLUME_DEFAULT);
    return clampVolume(parseFloat(raw));
  } catch {
    return clampVolume(ADMIN_UI_CLICK_VOLUME_DEFAULT);
  }
}

/**
 * Persist volume and notify listeners (same pattern as enabled toggle).
 */
export function setAdminUiClickSoundVolume(volume) {
  const v = clampVolume(volume);
  try {
    localStorage.setItem(STORAGE_KEY_UI_CLICK_VOLUME, String(v));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent('admin-ui-click-sound-prefs-changed'));
  } catch {
    /* ignore */
  }
}

/**
 * Move volume by N steps (e.g. -1 / +1). Returns the new volume after clamp; no-op at min/max.
 */
export function stepAdminUiClickSoundBy(deltaSteps) {
  const cur = getAdminUiClickSoundVolume();
  const next = clampVolume(cur + deltaSteps * ADMIN_UI_CLICK_VOLUME_STEP);
  if (next === cur) return cur;
  setAdminUiClickSoundVolume(next);
  return next;
}

/**
 * Preload WAV once; multiple Audio instances so rapid clicks do not wait for one clip to finish.
 */
export function initAdminUiClickSound() {
  if (initialized) return;
  initialized = true;
  const vol = getAdminUiClickSoundVolume();
  try {
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const a = new Audio(btnClickSrc);
      a.preload = 'auto';
      a.volume = vol;
      pool.push(a);
    }
  } catch {
    pool = [];
  }
}

/**
 * Short UI click — instant replay via round-robin pool.
 */
export function playAdminUiClickSound() {
  if (!isAdminUiClickSoundEnabled()) return;
  if (!pool.length) initAdminUiClickSound();
  if (!pool.length) return;
  const audio = pool[poolIndex % pool.length];
  poolIndex += 1;
  try {
    audio.volume = getAdminUiClickSoundVolume();
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * True if the event target is a “primary” clickable we should sound (buttons, links, menu items, etc.).
 * @param {EventTarget | null} target
 */
export function isAdminUiClickSoundTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const el = target instanceof Element ? target : null;
  if (!el) return false;

  if (el.closest('[data-no-ui-click-sound]')) return false;

  const tag = (el.tagName || '').toLowerCase();

  if (tag === 'textarea') return false;
  if (tag === 'select') return false;
  if (tag === 'option') return false;
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (
      ['text', 'email', 'password', 'search', 'number', 'tel', 'url', 'date', 'time', 'datetime-local', 'month', 'week', 'color', 'file', 'hidden'].includes(
        type
      )
    ) {
      return false;
    }
  }

  const hit = el.closest(
    [
      'button:not(:disabled)',
      '[role="button"]:not([aria-disabled="true"])',
      'a[href]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[role="switch"]',
      'summary',
      'input[type="button"]:not(:disabled)',
      'input[type="submit"]:not(:disabled)',
      'input[type="reset"]:not(:disabled)',
      'input[type="checkbox"]',
      'input[type="radio"]',
      'label[for]',
    ].join(', ')
  );

  return Boolean(hit);
}
