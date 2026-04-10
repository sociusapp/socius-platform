import { AppState, Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { getMyActiveHelpRequest } from '../api/incident.api';
import { loadAuth } from '../storage/asyncStorage.service';
import {
  ACTIVE_HELP_SESSION_NOTIF_ID,
  syncActiveHelpSessionNotification,
  stopActiveHelpSessionNotification,
} from './activeHelpSessionNotification';

const POLL_MS = 30000;

/** Previously synced request ids — used to cancel notifications when a session disappears server-side */
let lastDesiredIds = new Set();

/**
 * Parse `/help-request/active` payload (same shapes as SplashScreen).
 * @returns {{ requestId: string, sessionEndsAt: string|Date, sessionStartAt: string|Date|number, role: 'requester'|'helper' }[]}
 */
export function collectActiveHelpSessionsFromPayload(helpPayload) {
  const sessions = [];
  if (!helpPayload || typeof helpPayload !== 'object') return sessions;

  const reqList =
    Array.isArray(helpPayload.activeRequests) && helpPayload.activeRequests.length > 0
      ? helpPayload.activeRequests
      : helpPayload.activeRequest
        ? [helpPayload.activeRequest]
        : [];

  const helpList =
    Array.isArray(helpPayload.activeHelps) && helpPayload.activeHelps.length > 0
      ? helpPayload.activeHelps
      : helpPayload.activeHelp
        ? [helpPayload.activeHelp]
        : [];

  for (const r of reqList) {
    const st = String(r?.status || '').toLowerCase();
    if (!['matched', 'active'].includes(st)) continue;
    const rid = r?._id || r?.id;
    const end = r?.sessionEndsAt;
    if (!rid || !end) continue;
    const start = r.activeAt || r.matchedAt || r.updatedAt;
    sessions.push({
      requestId: String(rid),
      sessionEndsAt: end,
      sessionStartAt: start,
      role: 'requester',
    });
  }

  for (const h of helpList) {
    const req = h?.request || h?.requestId;
    const rid =
      typeof req === 'string'
        ? req
        : req?._id != null || req?.id != null
          ? String(req._id || req.id)
          : '';
    if (!rid) continue;
    const st = String(
      typeof req === 'object' && req ? req.status || '' : ''
    ).toLowerCase();
    const hst = String(h?.status || '').toLowerCase();
    if (!['matched', 'active'].includes(st) && hst !== 'accepted') continue;
    const end =
      typeof req === 'object' && req ? req.sessionEndsAt : null;
    if (!end) continue;
    const start =
      typeof req === 'object' && req
        ? req.activeAt || req.matchedAt || req.updatedAt
        : null;
    sessions.push({
      requestId: String(rid),
      sessionEndsAt: end,
      sessionStartAt: start,
      role: 'helper',
    });
  }

  return sessions;
}

/**
 * Fetch active help from API and sync Android progress notifications (all matching sessions).
 */
export async function refreshActiveHelpSessionNotifications() {
  if (Platform.OS !== 'android') return;

  const auth = await loadAuth();
  if (!auth?.accessToken) {
    lastDesiredIds = new Set();
    await stopActiveHelpSessionNotification();
    return;
  }

  try {
    const res = await getMyActiveHelpRequest(auth.accessToken);
    if (!res?.success || !res?.data) {
      lastDesiredIds = new Set();
      await stopActiveHelpSessionNotification();
      return;
    }

    await applySessionsFromPayload(res.data);
  } catch (e) {
    if (__DEV__) {
      console.warn('[activeHelpSessionSync] refresh failed', e?.message || e);
    }
  }
}

export async function applySessionsFromPayload(helpPayload) {
  if (Platform.OS !== 'android') return;

  try {
    await notifee.cancelNotification(ACTIVE_HELP_SESSION_NOTIF_ID);
  } catch (e) {}

  const sessions = collectActiveHelpSessionsFromPayload(helpPayload);
  const desired = new Set(sessions.map((s) => s.requestId));

  for (const id of lastDesiredIds) {
    if (!desired.has(id)) {
      await stopActiveHelpSessionNotification(id);
    }
  }
  lastDesiredIds = desired;

  for (const s of sessions) {
    await syncActiveHelpSessionNotification(s);
  }

  if (sessions.length === 0) {
    lastDesiredIds = new Set();
  }
}

let pollTimer = null;
let appStateSub = null;

export function startActiveHelpSessionNotificationCoordinator() {
  if (Platform.OS !== 'android') return;

  void refreshActiveHelpSessionNotifications();

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    void refreshActiveHelpSessionNotifications();
  }, POLL_MS);

  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  appStateSub = AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      void refreshActiveHelpSessionNotifications();
    }
  });
}

export function stopActiveHelpSessionNotificationCoordinator() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
}
