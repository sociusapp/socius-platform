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

/**
 * Meeting "session window" = agreed help period (original ask + any extensions). Not travel time.
 * Used by helper/requester MatchingMap countdown tickers.
 */
export function formatMeetingWindowCountdownTick(endIso, nowMs = Date.now()) {
  if (endIso == null || endIso === '') {
    return { line: 'Waiting for window', detail: 'Timer runs once the session end time is set.', variant: 'unset' };
  }
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(endMs)) {
    return { line: '—', detail: 'Could not read session end time.', variant: 'error' };
  }
  const diff = endMs - nowMs;
  if (diff <= 0) {
    return {
      line: 'Window ended',
      detail: 'The agreed time is over. You can still close the session or message if needed.',
      variant: 'ended',
    };
  }
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return {
    line: `${mins}m ${secs.toString().padStart(2, '0')}s left`,
    detail: 'Time remaining until this meeting window closes (includes any extensions).',
    variant: 'live',
  };
}

/** Short labels for stats rows (both roles). */
export const MEETING_TIME_COPY = {
  plannedDurationLabel: 'Planned duration',
  plannedDurationHint: 'What was asked when the request started (before extensions).',
  countdownLabel: 'Window countdown',
  countdownHint: 'Live time left in the meeting window.',
  delayTabHelperLead:
    'Requester extensions move the session end time. Countdown, Delay tab, and helper Overview use the same timer.',
  extendTabRequesterLead:
    'Extra minutes extend the meeting window for both sides. Travel time is separate — this only changes how long the session can stay open.',
};
