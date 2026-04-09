// ─── USER ───────────────────────────────────────────────
const USER_ROLES = {
  COMMUNITY_MEMBER: 'community_member',
  AVAILABLE_TO_HELP: 'available_to_help',
  BOTH: 'both',
}

const ACCOUNT_STATUS = {
  PENDING_REVIEW: 'pending_review',
  ACTIVE: 'active',
  LIMITED: 'limited',
  SUSPENDED: 'suspended',
}

const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  PREFER_NOT: 'prefer_not_to_say',
}

// ─── NOTIFICATION PREFERENCES ───────────────────────────
const NOTIFICATION_PREFERENCES = {
  CALM_PRESENCE: 'calm_presence',
  COMMUNITY_SAFETY: 'community_safety',
  ELDER_SUPPORT: 'elder_support',
  WOMENS_SAFETY: 'womens_safety',
  MEDICAL_ASSISTANCE: 'medical_assistance',
  LANGUAGE_HELP: 'language_help',
  BLOOD_DONATION: 'blood_donation',
  GENERAL_SUPPORT: 'general_support',
}

// ─── HELP REQUEST ────────────────────────────────────────
const HELP_CATEGORIES = {
  CALM_PRESENCE: 'calm_presence',
  CARE_SUPPORT: 'care_support',
  MEDICAL_AWARENESS: 'medical_awareness',
  LANGUAGE_SUPPORT: 'language_support',
  ELDER_ASSISTANCE: 'elder_assistance',
  COMMUNITY_UPKEEP: 'community_upkeep',
}

const HELP_REQUEST_STATUS = {
  OPEN: 'open',
  MATCHING: 'matching',
  MATCHED: 'matched',
  ACTIVE: 'active',
  CLOSING: 'closing',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
  AUTO_CLOSED: 'auto_closed',
}

const HELP_MATCH_STATUS = {
  PENDING: 'pending',
  NOTIFIED: 'notified',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NOT_AVAILABLE: 'not_available',
}

// ─── PRESENCE REQUEST ────────────────────────────────────
const PRESENCE_SITUATION = {
  NEED_CALM_PRESENCE: 'need_calm_presence',
  BEING_FOLLOWED: 'being_followed',
  FEELING_UNSAFE: 'feeling_unsafe',
  OTHER: 'other',
}

const PRESENCE_STATUS = {
  ACTIVE: 'active',
  HELPERS_NOTIFIED: 'helpers_notified',
  HELPERS_ACCEPTED: 'helpers_accepted',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
  AUTO_CLOSED: 'auto_closed',
}

const PRESENCE_MATCH_STATUS = {
  ALERTED: 'alerted',
  ACCEPTED: 'accepted',
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  CLOSED: 'closed',
  DECLINED: 'declined',
  NOT_RESPONDED: 'not_responded',
}

const PRESENCE_CLOSURE_REASON = {
  CALM_MEDIATION: 'calm_mediation',
  NO_LONGER_NEEDED: 'no_longer_needed',
  SITUATION_CHANGED: 'situation_changed',
  CHOSE_TO_STEP_AWAY: 'chose_to_step_away',
  EMERGENCY_SERVICES_CALLED: 'emergency_services_called',
}

// ─── CHAT ────────────────────────────────────────────────
const CHAT_SESSION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
}

const REQUEST_TYPE = {
  HELP: 'HelpRequest',
  PRESENCE: 'PresenceRequest',
}

// ─── VERIFICATION ────────────────────────────────────────
const VERIFICATION_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  FAILED: 'failed',
  REVIEW_REQUESTED: 'review_requested',
}

const DOCUMENT_TYPE = {
  AADHAAR: 'aadhaar',
  DRIVING_LICENSE: 'driving_license',
  VOTER_ID: 'voter_id',
  OTHER: 'other',
}

const VERIFICATION_FAILURE_REASONS = {
  IMAGE_UNCLEAR: 'image_unclear',
  DOCUMENT_NOT_VISIBLE: 'document_not_visible',
  INFORMATION_MISMATCH: 'information_mismatch',
  MISSING_REQUIRED_DETAIL: 'missing_required_detail',
  SELFIE_INVALID: 'selfie_invalid',
  OTHER: 'other',
}

// ─── SUBSCRIPTION ────────────────────────────────────────
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PENDING: 'pending',
  NONE: 'none',
}

const PAYMENT_METHOD = {
  UPI: 'upi',
  CARD: 'card',
}

// ─── BADGE ───────────────────────────────────────────────
const BADGE_TYPE = {
  CLOSES_PROPERLY: 'closes_properly',
  RETURNS_ON_TIME: 'returns_on_time',
  ALSO_HELPS_OTHERS: 'also_helps_others',
  OCCASIONAL_REQUESTER: 'occasional_requester',
}

const BADGE_AWARDED_BY = {
  SYSTEM: 'system',
  ADMIN: 'admin',
}

// ─── REPORT ──────────────────────────────────────────────
const REPORT_CATEGORY = {
  FELT_UNCOMFORTABLE: 'felt_uncomfortable',
  PERSONAL_BOUNDARIES_CROSSED: 'personal_boundaries_crossed',
  MISUSE_OF_PLATFORM: 'misuse_of_platform',
  FALSE_UNNECESSARY_REQUEST: 'false_unnecessary_request',
  SOMETHING_ELSE: 'something_else',
}

const REPORT_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
}

const REPORT_ACTION = {
  NO_ACTION: 'no_action',
  USER_WARNED: 'user_warned',
  ACCOUNT_LIMITED: 'account_limited',
  ACCOUNT_SUSPENDED: 'account_suspended',
  DISMISSED: 'dismissed',
}

// ─── OTP ─────────────────────────────────────────────────
const OTP = {
  EXPIRY_MINUTES: 10,
  LENGTH: 6,
  MAX_ATTEMPTS: 5,
  RESEND_AFTER_SECONDS: 30,
}

// ─── NOTIFICATIONS ───────────────────────────────────────
const NOTIFICATION_TYPE = {
  HELP_REQUEST_ALERT: 'help_request_alert',     // High alarm
  HELP_REQUEST_DATA: 'help_request',           // Data payload (call-style UI)
  PRESENCE_ALARM: 'presence_alarm',             // High alarm
  ACCOUNT_UPDATE: 'account_update',
  SUBSCRIPTION: 'subscription',
  REQUEST_STATUS: 'request_status',
  REVIEW_DECISION: 'review_decision',
  CHAT_MESSAGE: 'chat_message',
  CANCEL_ALARM: 'cancel_alarm',
  REQUEST_ACKNOWLEDGED: 'request_acknowledged',
  NO_HELPERS_NEARBY: 'no_helpers_nearby',
  REQUEST_EXPIRING_WARNING: 'request_expiring_warning',
  HELPER_ARRIVED: 'helper_arrived',
  HELPER_DISTANCE_UPDATE: 'helper_distance_update',
  COMMUNITY_BALANCE_NUDGE: 'community_balance_nudge',
  BADGE_EARNED: 'badge_earned',
  REQUEST_REMATCHED: 'request_rematched',
  REQUEST_COMPLETION_PROMPT: 'request_completion_prompt',
  /** Helper: scheduled meeting window ended (allotted time complete) */
  HELP_SESSION_TIME_ENDED_HELPER: 'help_session_time_ended_helper',
  /** Helper: requester extended the session — new end time in payload */
  HELP_SESSION_EXTENDED_HELPER: 'help_session_extended_helper',
  BORROW_ITEM_REQUEST: 'borrow_item_request',
  BORROW_ITEM_STATUS: 'borrow_item_status',
}

const NOTIFICATION_PRIORITY = {
  HIGH: 'high',
  NORMAL: 'normal',
}

// ─── GEO ─────────────────────────────────────────────────
const GEO = {
  DEFAULT_RADIUS_METERS: 500,       // 500m nearby search
  PRESENCE_RADIUS_METERS: 500,      // 500m for presence alert
  MAX_RADIUS_METERS: 10000,         // 10km max
}

// ─── AUTO CLOSE ──────────────────────────────────────────
const AUTO_CLOSE = {
  HELP_REQUEST_MINUTES: 60,         // 1 hour inactivity (unmatched open/matching only)
  /** After a helper accepts, extend SLA so the meeting is not killed by the original timer */
  HELP_MATCHED_EXTENSION_MINUTES: 24 * 60,
  PRESENCE_REQUEST_MINUTES: 30,     // 30 min inactivity
  CHAT_DELETE_AFTER_HOURS: 24,      // messages delete 24hr after close
}

// ─── COMMUNITY BALANCE ───────────────────────────────────
const COMMUNITY_BALANCE = {
  NUDGE_THRESHOLD: 3,               // help_requests_sent - help_given > 3 = nudge dikhao
  NUDGE_COOLDOWN_DAYS: 7,           // 7 din baad phir nudge
}

// ─── PAGINATION ──────────────────────────────────────────
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
}

// ─── PRESENCE HELPERS ────────────────────────────────────
const PRESENCE_HELPERS = {
  MIN: 2,
  MAX: 5,
  DEFAULT: 3,
}

module.exports = {
  USER_ROLES,
  ACCOUNT_STATUS,
  GENDER,
  NOTIFICATION_PREFERENCES,
  HELP_CATEGORIES,
  HELP_REQUEST_STATUS,
  HELP_MATCH_STATUS,
  PRESENCE_SITUATION,
  PRESENCE_STATUS,
  PRESENCE_MATCH_STATUS,
  PRESENCE_CLOSURE_REASON,
  CHAT_SESSION_STATUS,
  REQUEST_TYPE,
  VERIFICATION_STATUS,
  DOCUMENT_TYPE,
  VERIFICATION_FAILURE_REASONS,
  SUBSCRIPTION_STATUS,
  PAYMENT_METHOD,
  BADGE_TYPE,
  BADGE_AWARDED_BY,
  REPORT_CATEGORY,
  REPORT_STATUS,
  REPORT_ACTION,
  OTP,
  NOTIFICATION_TYPE,
  NOTIFICATION_PRIORITY,
  GEO,
  AUTO_CLOSE,
  COMMUNITY_BALANCE,
  PAGINATION,
  PRESENCE_HELPERS,
}
