import notifee from '@notifee/react-native';
import { Platform } from 'react-native';
import { CHANNELS, initNotifeeChannels } from './SociusNotificationService';

/** @deprecated Legacy single-id notification; cancelled on sync for migration */
export const ACTIVE_HELP_SESSION_NOTIF_ID = 'socius_active_help_session';

export const notificationIdForActiveHelpSession = (requestId) =>
  `socius_active_help_session_${String(requestId)}`;

/** Progress bar + title accent */
const SESSION_PROGRESS_COLOR = '#10B981';
const TICK_MS = 4000;

/** requestId -> interval handle */
const tickIntervals = new Map();

/** Avoid stacking duplicate local “time’s up” prompts from tight re-renders. */
const lastLocalCompletionPromptByRequest = new Map();

const formatRemaining = (ms) => {
  if (ms <= 0) return 'Ending now';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m left`;
  }
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
};

/** Plain function (no nested closure) so Hermes/hot-reload never keeps stale template refs */
function buildActiveSessionBody(role, remainingMs, pctThrough) {
  const timeLeft = formatRemaining(remainingMs);
  if (String(role) === 'helper') {
    return `Help / handoff time · ${timeLeft} · ${pctThrough}% of window`;
  }
  return `Item return · ${timeLeft} · ${pctThrough}% of window`;
}

/**
 * Android ongoing notification with progress (elapsed vs total window).
 * One interval per requestId; safe to call repeatedly to update times.
 */
export const syncActiveHelpSessionNotification = async ({
  requestId,
  sessionEndsAt,
  sessionStartAt,
  role = 'requester',
}) => {
  if (Platform.OS !== 'android' || !requestId || !sessionEndsAt) return;

  await initNotifeeChannels();

  const rid = String(requestId);
  const notifId = notificationIdForActiveHelpSession(rid);

  const end = new Date(sessionEndsAt).getTime();
  const start = new Date(sessionStartAt || end - 30 * 60 * 1000).getTime();
  const total = Math.max(60000, end - start);

  /** Not a “meeting” — this is the agreed help / item-return time window */
  const title =
    role === 'helper'
      ? 'Helping · help time left'
      : 'Your help · return window';
  const bodyLine = (remainingMs, pctThrough) => {
    const timeLeft = formatRemaining(remainingMs);
    if (role === 'helper') {
      return `Help / handoff time · ${timeLeft} · ${pctThrough}% of window`;
    }
    return `Item return & help time · ${timeLeft} · ${pctThrough}% of window`;
  };

  if (tickIntervals.has(rid)) {
    clearInterval(tickIntervals.get(rid));
    tickIntervals.delete(rid);
  }

  const render = async () => {
    const now = Date.now();
    const remaining = Math.max(0, end - now);
    if (remaining <= 0) {
      await stopActiveHelpSessionNotification(rid);
      const nowTs = Date.now();
      const prev = lastLocalCompletionPromptByRequest.get(rid) || 0;
      if (role === 'requester' && nowTs - prev > 20000) {
        lastLocalCompletionPromptByRequest.set(rid, nowTs);
        try {
          const { displayRequestCompletionPrompt } = await import('./requestCompletionPrompt');
          await displayRequestCompletionPrompt({
            requestId: rid,
            sessionEndsAt: new Date(end).toISOString(),
          });
        } catch (e) {
          console.warn('[activeHelpSession] completion prompt failed', e);
        }
      }
      return;
    }
    const elapsed = Math.min(total, Math.max(0, now - start));
    const current = Math.min(100, Math.round((elapsed / total) * 100));

    try {
      await notifee.displayNotification({
        id: notifId,
        title,
        body: buildActiveSessionBody(role, remaining, current),
        data: {
          type: 'active_help_session',
          requestId: rid,
          role: String(role),
        },
        android: {
          channelId: CHANNELS.UPDATES,
          color: SESSION_PROGRESS_COLOR,
          ongoing: true,
          autoCancel: false,
          onlyAlertOnce: true,
          showTimestamp: true,
          progress: { max: 100, current },
          pressAction: { id: 'default', launchActivity: 'default' },
        },
      });
    } catch (e) {
      console.warn('[activeHelpSession] display failed', e);
    }
  };

  await render();
  tickIntervals.set(
    rid,
    setInterval(render, TICK_MS)
  );
};

/**
 * Stop progress notification(s).
 * @param {string} [requestId] — if omitted, stops all session notifications + legacy id.
 */
export const stopActiveHelpSessionNotification = async (requestId) => {
  if (requestId != null && requestId !== '') {
    const rid = String(requestId);
    const h = tickIntervals.get(rid);
    if (h) {
      clearInterval(h);
      tickIntervals.delete(rid);
    }
    try {
      await notifee.cancelNotification(notificationIdForActiveHelpSession(rid));
    } catch (e) {}
    return;
  }

  const rids = [...tickIntervals.keys()];
  for (const h of tickIntervals.values()) {
    clearInterval(h);
  }
  tickIntervals.clear();
  for (const rid of rids) {
    try {
      await notifee.cancelNotification(notificationIdForActiveHelpSession(rid));
    } catch (e) {}
  }
  try {
    await notifee.cancelNotification(ACTIVE_HELP_SESSION_NOTIF_ID);
  } catch (e) {}
};
