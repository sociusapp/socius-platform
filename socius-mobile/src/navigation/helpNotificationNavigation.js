/**
 * Role-aware deep links for Daily Help meeting flows (requester vs helper).
 * FCM / Notifee should include recipientRole when possible; otherwise we infer via API.
 */

import { loadAuth } from '../services/storage/asyncStorage.service';
import { getHelpRequestById } from '../services/api/incident.api';
import { normalizeRecipientRole as normalizeRecipientRolePure } from '../utils/helpRecipientRole';

export const HELP_MEETING_SCREENS = {
  requester: 'RequesterMatchingMap',
  helper: 'MatchingMap',
};

const ALERT_DEDUPE_MS = 5500;
const alertDedupe = new Map();

/**
 * Returns false if the same requestId+status was surfaced recently (FCM + socket double-fire).
 */
export function shouldShowRequestStatusModal(requestId, status, windowMs = ALERT_DEDUPE_MS) {
  const key = `${String(requestId || '')}:${String(status || '').toLowerCase()}`;
  const now = Date.now();
  const last = alertDedupe.get(key);
  if (last != null && now - last < windowMs) {
    return false;
  }
  alertDedupe.set(key, now);
  if (alertDedupe.size > 100) {
    for (const [k, t] of alertDedupe) {
      if (now - t > windowMs * 6) alertDedupe.delete(k);
    }
  }
  return true;
}

export function normalizeRecipientRole(value) {
  return normalizeRecipientRolePure(value);
}

/** FCM / Notifee chat payload: `requestType` from ChatSession (e.g. PresenceRequest vs HelpRequest). */
export function isPresenceChatNotification(data) {
  const raw = String(data?.requestType ?? '').trim();
  if (!raw) return false;
  const compact = raw.replace(/\s/g, '');
  if (compact === 'PresenceRequest') return true;
  const lower = compact.toLowerCase();
  return lower === 'presencerequest' || lower === 'presence_request';
}

/** Map notification `recipientRole` to NearbyMap `mode` param. */
export function presenceNearbyMapModeFromChatNotification(data) {
  let role = normalizeRecipientRole(data?.recipientRole);
  if (!role) {
    const ib = String(data?.initiatedBy || '').toLowerCase();
    if (ib === 'requester') role = 'helper';
    else if (ib === 'helper') role = 'requester';
  }
  if (!role) role = 'requester';
  return role === 'helper' ? 'helper' : 'requester';
}

function meetingRouteForRole(role) {
  return role === 'helper' ? HELP_MEETING_SCREENS.helper : HELP_MEETING_SCREENS.requester;
}

function asId(ref) {
  if (ref == null) return '';
  if (typeof ref === 'object' && ref._id != null) return String(ref._id);
  return String(ref);
}

export async function inferRecipientRoleForRequest(requestId) {
  try {
    const auth = await loadAuth();
    const token = auth?.accessToken;
    const uid = auth?.userId != null ? String(auth.userId) : '';
    if (!token || !requestId || !uid) return null;
    const res = await getHelpRequestById(token, requestId);
    if (!res?.success) return null;
    const payload = res.data || {};
    const req = payload.request || payload;
    if (!req) return null;
    const requesterId = asId(req.requesterId);
    if (requesterId && requesterId === uid) return 'requester';
    // API returns `volunteer` on `data`, not on `request` (see helpRequest.service getRequestById).
    const volunteer = payload.volunteer || req.volunteer || req.acceptedBy || req.helper;
    const helperIdFromVolunteer = volunteer != null ? asId(volunteer._id ?? volunteer) : '';
    if (helperIdFromVolunteer && helperIdFromVolunteer === uid) return 'helper';
    const match = payload.match;
    const matchHelperId = match != null ? asId(match.helperId) : '';
    if (matchHelperId && matchHelperId === uid) return 'helper';
    return null;
  } catch {
    return null;
  }
}

function roleFromNotificationType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'help_session_time_ended_helper' || t === 'help_session_extended_helper') return 'helper';
  if (t === 'borrow_item_request') return 'helper';
  if (t === 'offer_item_request') return 'requester';
  if (t === 'request_completion_prompt') return 'requester';
  return null;
}

/**
 * True if the focused screen is already one of the meeting maps for this request
 * (those screens show their own closure / ended modals).
 */
export function isUserOnHelpMeetingScreen(navRef, requestId) {
  if (!navRef?.isReady?.()) return false;
  try {
    const route = navRef.getCurrentRoute?.();
    if (!route?.name || !requestId) return false;
    const rid = route.params?.requestId;
    if (!rid || String(rid) !== String(requestId)) return false;
    return route.name === HELP_MEETING_SCREENS.requester || route.name === HELP_MEETING_SCREENS.helper;
  } catch {
    return false;
  }
}

/**
 * Navigate to the correct meeting stack screen for the current user and request.
 */
export async function navigateToHelpMeeting(navRef, { requestId, data = {}, openChat = false } = {}) {
  if (!navRef?.isReady?.() || !requestId) return;

  // Prefer explicit recipient role only — `userRole` / `role` often describe the sender or a generic
  // app role and have misrouted helpers to the requester meeting screen.
  let role = normalizeRecipientRole(data.recipientRole);
  if (!role) {
    const ib = String(data.initiatedBy || '').toLowerCase();
    if (ib === 'requester') role = 'helper';
    else if (ib === 'helper') role = 'requester';
  }
  if (!role) {
    role = roleFromNotificationType(data.type);
  }
  if (!role) {
    role = await inferRecipientRoleForRequest(requestId);
  }
  if (!role) {
    if (__DEV__) {
      console.warn('[navigateToHelpMeeting] Could not resolve role; defaulting to requester', {
        requestId,
        type: data.type,
        hasRecipientRole: Boolean(data.recipientRole),
      });
    }
    role = 'requester';
  }

  const screen = meetingRouteForRole(role);
  if (openChat) {
    navRef.navigate(screen, { requestId, openChat: true });
  } else {
    navRef.navigate(screen, { requestId });
  }
}
