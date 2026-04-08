import notifee from '@notifee/react-native';
import { Platform } from 'react-native';
import { CHANNELS, initNotifeeChannels } from './SociusNotificationService';

export const ACTIVE_HELP_SESSION_NOTIF_ID = 'socius_active_help_session';

/** Progress bar + title accent (Material progress tint follows notification color on most devices). */
const SESSION_PROGRESS_COLOR = '#10B981';
const TICK_MS = 4000;

let tickInterval = null;
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

/**
 * Android ongoing notification with progress (elapsed vs total window).
 * Call again when sessionEndsAt changes (extend).
 */
export const syncActiveHelpSessionNotification = async ({
  requestId,
  sessionEndsAt,
  sessionStartAt,
}) => {
  if (Platform.OS !== 'android' || !requestId || !sessionEndsAt) return;

  await initNotifeeChannels();

  const end = new Date(sessionEndsAt).getTime();
  const start = new Date(sessionStartAt || end - 30 * 60 * 1000).getTime();
  const total = Math.max(60000, end - start);

  const render = async () => {
    const now = Date.now();
    const remaining = Math.max(0, end - now);
    if (remaining <= 0) {
      await stopActiveHelpSessionNotification();
      const rid = String(requestId);
      const now = Date.now();
      const prev = lastLocalCompletionPromptByRequest.get(rid) || 0;
      if (now - prev > 20000) {
        lastLocalCompletionPromptByRequest.set(rid, now);
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
        id: ACTIVE_HELP_SESSION_NOTIF_ID,
        title: 'Your request is active',
        body: `${formatRemaining(remaining).replace(' left', '')} to give back · ${current}% left`,
        data: {
          type: 'active_help_session',
          requestId: String(requestId),
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
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(render, TICK_MS);
};

export const stopActiveHelpSessionNotification = async () => {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  try {
    await notifee.cancelNotification(ACTIVE_HELP_SESSION_NOTIF_ID);
  } catch (e) {}
};
