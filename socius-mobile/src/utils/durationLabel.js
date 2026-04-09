/**
 * Help requests store `requestedDurationLabel` (string) from the app; numeric fields may be absent.
 * Parse a minute value for timers, extension history seeds, and consistent UI.
 */
export function parseMinutesFromDurationLabel(label) {
  if (label == null) return 0;
  const s = String(label).trim();
  if (!s) return 0;
  const lower = s.toLowerCase();
  const hour = lower.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)\b/);
  if (hour) return Math.max(1, Math.round(parseFloat(hour[1], 10) * 60));
  const range = s.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) return Math.max(1, Math.round((Number(range[1]) + Number(range[2])) / 2));
  const num = s.match(/(\d+)/);
  return num ? Math.max(1, Number(num[1])) : 0;
}

/** Human-readable duration from minutes (matches meeting screens). */
export function formatMinutesAsDurationLabel(mins) {
  const m = Number(mins);
  if (!Number.isFinite(m) || m <= 0) return '';
  if (m < 60) return `${Math.round(m)} min`;
  return `${(m / 60).toFixed(m % 60 === 0 ? 0 : 1)} hour`;
}
