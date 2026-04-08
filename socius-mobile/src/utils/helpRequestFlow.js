/**
 * Help request lifecycle (daily help) — shared UI/navigation rules for requester vs helper.
 * Backend statuses: open → matching → matched/active/… → closing → closed | cancelled | auto_closed
 */

export const MEETING_ACTIVE_STATUSES = new Set([
  'accepted',
  'in_progress',
  'matched',
  'en_route',
  'arrived',
  'active',
]);

/** Request is fully finished; user should leave the meeting UI. */
export const TERMINAL_STATUSES = new Set(['closed', 'cancelled', 'auto_closed']);

export const normalizeHelpStatus = (status) => String(status || '').toLowerCase().trim();

export const isMeetingActive = (status) => MEETING_ACTIVE_STATUSES.has(normalizeHelpStatus(status));

export const isClosingStatus = (status) => normalizeHelpStatus(status) === 'closing';

export const isTerminalHelpStatus = (status) => TERMINAL_STATUSES.has(normalizeHelpStatus(status));

/** Ongoing meeting UI: actively helping or waiting on closure forms. */
export const canStayOnMeetingMap = (status) => isMeetingActive(status) || isClosingStatus(status);

/** Chat only while meeting is actively ongoing (not while closure forms are pending). */
export const isChatAllowedForStatus = (status) => isMeetingActive(status);

/**
 * Requester submits closure feedback via ClosingRequestScreen (requester feedback shape).
 * Helper submits via ThankYouClosingScreen (helper feedback shape).
 */
export const ROUTES = {
  requesterClosure: 'ClosingRequest',
  helperClosure: 'ThankYouClosing',
};
