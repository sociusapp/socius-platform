import { Platform } from 'react-native';
import notifee, {
  AndroidCategory,
  AndroidColor,
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';

import NativeCallService from './NativeCallService';
import { loadAuth } from '../storage/asyncStorage.service';
import { markRequestDelivered } from '../api/incident.api';
import { baseURL } from '../api/client';

export const CHANNELS = {
  PRESENCE_ALARM: 'socius_presence_alarm',
  HELP_ALARM:     'socius_help_alarm',
  UPDATES:        'socius_updates',
};

let initialized = false;

export const displaySociusUpdateNotification = async (rawData) => {
  if (Platform.OS !== 'android') return;
  const data = rawData || {};
  const upper = String(data.type || '')
    .toUpperCase()
    .replace(/-/g, '_');
  const idBase = String(data.requestId || data.badgeType || 'upd');
  let title = 'Socius';
  let body = 'Tap to open the app.';
  let channelId = CHANNELS.UPDATES;
  let importance = AndroidImportance.DEFAULT;
  switch (upper) {
    case 'REQUEST_ACKNOWLEDGED':
      title = 'Request live';
      body = 'Your help request is active.';
      break;
    case 'NO_HELPERS_NEARBY':
      title = 'Looking for helpers';
      body = 'No one is in range yet — we will notify when someone is nearby.';
      break;
    case 'REQUEST_EXPIRING_WARNING':
      title = data.phase === 't5' ? 'Expiring in ~5 min' : 'Expiring in ~15 min';
      body = 'Still no match — you can wait or adjust your request.';
      importance = AndroidImportance.HIGH;
      break;
    case 'HELPER_ARRIVED':
      title = 'Helper nearby';
      body = 'They are close — check the map or chat.';
      break;
    case 'COMMUNITY_BALANCE_NUDGE':
      title = 'Community balance';
      body = 'Consider helping nearby when you can.';
      break;
    case 'BADGE_EARNED':
      title = 'Badge earned';
      body = data.badgeTitle ? String(data.badgeTitle) : 'You earned a new badge!';
      break;
    case 'HELPER_DISTANCE_UPDATE':
      title = 'Helper on the way';
      body =
        data.distanceMeters != null
          ? `About ${Math.round(Number(data.distanceMeters))}m away`
          : 'Location updated';
      break;
    case 'HELP_SESSION_TIME_ENDED_HELPER':
      title = 'Return time ended';
      body =
        'The agreed item return time has ended. Open Socius to follow up with the requester.';
      channelId = CHANNELS.HELP_ALARM;
      importance = AndroidImportance.HIGH;
      break;
    case 'HELP_SESSION_EXTENDED_HELPER':
      title = 'Session extended';
      body = data.additionalMinutes
        ? `The requester added ${String(data.additionalMinutes)} minutes. Your meeting end time was updated.`
        : 'The requester extended the meeting time. Open the app for the new end time.';
      channelId = CHANNELS.UPDATES;
      importance = AndroidImportance.DEFAULT;
      break;
    case 'BORROW_ITEM_REQUEST': {
      const item = String(data.itemName || 'Requested item').trim();
      const mins = Number(data.requestedMinutes || 0);
      const minsText = Number.isFinite(mins) && mins > 0 ? `${mins} min` : 'custom time';
      title = 'Borrow item request';
      body = `${item} • ${minsText}`;
      if (data.note) body = `${body}\n${String(data.note).slice(0, 80)}`;
      importance = AndroidImportance.HIGH;
      break;
    }
    case 'REVIEW_DECISION': {
      const approved = String(data.approved || '').toLowerCase() === 'true';
      title = approved ? 'Verification approved' : 'Verification update';
      body = approved
        ? 'Your account has been approved. Open Socius to continue.'
        : 'Verification was not approved. Open Socius to review and resubmit.';
      importance = AndroidImportance.HIGH;
      break;
    }
    default:
      break;
  }
  try {
    await notifee.displayNotification({
      id: `soc_${upper}_${idBase}`.replace(/[^a-zA-Z0-9_:.-]/g, '_').slice(0, 120),
      title,
      body,
      android: {
        channelId,
        pressAction: { id: 'default', launchActivity: 'default' },
        importance,
        style: { type: AndroidStyle.BIGTEXT, text: body },
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v != null ? String(v) : ''])
      ),
    });
  } catch (e) {
    console.warn('[Notifee] displaySociusUpdateNotification failed', e);
  }

  // Helper session-ended/extended updates should remain normal-priority updates.
};

/**
 * FCM does not show a system banner while the app is foregrounded. Mirror native alarm channels so users
 * still get a high-importance, call-category heads-up in the tray (alongside the in-app modal).
 */
export const displayAndroidForegroundIncomingHeadsUp = async (kind, rawData = {}) => {
  if (Platform.OS !== 'android') return;
  const data = rawData || {};
  const requestId = String(data.requestId || data.presenceId || data.id || '');
  if (!requestId) return;
  try {
    await initNotifeeChannels();
  } catch (e) {
    return;
  }
  const isHelp = kind === 'help';
  // Keep high alarm behavior in header tray as requested.
  const channelId = isHelp ? CHANNELS.HELP_ALARM : CHANNELS.PRESENCE_ALARM;
  const title = isHelp ? 'Someone nearby needs help' : 'Presence alert nearby';
  const itemName = String(data.categoryName || data.category || data.situationType || 'Help request')
    .replace(/_/g, ' ')
    .trim()
    .slice(0, 70);
  const area = String(data.area || data.locationLabel || data.cityArea || '').trim();
  const rawDistance = Number(data.distanceMeters ?? data.distance_meters ?? data.distance);
  const distanceLabel = Number.isFinite(rawDistance) && rawDistance > 0
    ? rawDistance < 1000
      ? `${Math.round(rawDistance)}m away`
      : `${(rawDistance / 1000).toFixed(1)}km away`
    : '';
  const itemLine = `Items: ${itemName || 'Help request'}`;
  const locationValue = [area, distanceLabel].filter(Boolean).join(' • ');
  const locationLine = `Location: ${locationValue || 'Nearby'}`;
  const body = [itemLine, locationLine].join('\n').slice(0, 260);
  const categoryIconPath = String(data.categoryIcon || '').trim();
  const root = String(baseURL || '').replace(/\/api\/?$/, '');
  const largeIcon =
    categoryIconPath.length > 0
      ? categoryIconPath.startsWith('http://') || categoryIconPath.startsWith('https://')
        ? categoryIconPath
        : `${root}${categoryIconPath.startsWith('/') ? '' : '/'}${categoryIconPath}`
      : undefined;
  const notifType = isHelp ? 'help_request' : 'presence_alarm';
  const notifData = Object.fromEntries(
    Object.entries({
      ...data,
      type: notifType,
      requestId,
    }).map(([k, v]) => [k, v != null ? String(v) : ''])
  );
  try {
    await notifee.displayNotification({
      id: `${isHelp ? 'fg_help' : 'fg_presence'}_${requestId}`.slice(0, 120),
      title,
      body: body || title,
      android: {
        channelId,
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        ongoing: true,
        autoCancel: false,
        style: { type: AndroidStyle.BIGTEXT, text: body || title },
        pressAction: { id: 'default', launchActivity: 'default' },
        ...(largeIcon ? { largeIcon } : {}),
        actions: [
          {
            title: 'Not available',
            pressAction: { id: isHelp ? 'decline_help' : 'decline_presence', launchActivity: 'default' },
          },
          {
            title: 'view',
            pressAction: { id: 'default', launchActivity: 'default' },
          },
        ],
      },
      data: notifData,
    });
  } catch (e) {
    console.warn('[Notifee] displayAndroidForegroundIncomingHeadsUp failed', e);
  }
};

export const displayBorrowItemActionNotification = async (rawData = {}) => {
  if (Platform.OS !== 'android') return;
  const data = rawData || {};
  const requestId = String(data.requestId || '');
  const borrowId = String(data.borrowId || '');
  if (!requestId || !borrowId) return;
  await initNotifeeChannels();
  const itemName = String(data.itemName || 'Requested item').trim();
  const mins = Number(data.requestedMinutes || 0);
  const minsText = Number.isFinite(mins) && mins > 0 ? `${mins} min` : 'custom time';
  const note = String(data.note || '').trim();
  const body = note
    ? `${itemName} • ${minsText}\n${note}`.slice(0, 260)
    : `${itemName} • ${minsText}`;
  const notifData = Object.fromEntries(
    Object.entries({
      ...data,
      type: 'borrow_item_request',
      requestId,
      borrowId,
    }).map(([k, v]) => [k, v != null ? String(v) : ''])
  );
  await notifee.displayNotification({
    id: `borrow_req_${borrowId}`.slice(0, 120),
    title: 'Borrow item request',
    body,
    android: {
      channelId: CHANNELS.HELP_ALARM,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      ongoing: true,
      autoCancel: false,
      style: { type: AndroidStyle.BIGTEXT, text: body },
      pressAction: { id: 'default', launchActivity: 'default' },
      actions: [
        { title: 'View', pressAction: { id: 'borrow_view', launchActivity: 'default' } },
        { title: 'Accept', pressAction: { id: 'borrow_accept', launchActivity: 'default' } },
        { title: 'Decline', pressAction: { id: 'borrow_decline', launchActivity: 'default' } },
      ],
    },
    data: notifData,
  });
};

const SOCIUS_DATA_UPDATE_TYPES = new Set([
  'REQUEST_ACKNOWLEDGED',
  'NO_HELPERS_NEARBY',
  'REQUEST_EXPIRING_WARNING',
  'HELPER_ARRIVED',
  'COMMUNITY_BALANCE_NUDGE',
  'BADGE_EARNED',
  'HELPER_DISTANCE_UPDATE',
  'HELP_SESSION_TIME_ENDED_HELPER',
  'HELP_SESSION_EXTENDED_HELPER',
  'BORROW_ITEM_REQUEST',
  'REVIEW_DECISION',
]);

export const initNotifeeChannels = async () => {
  if (initialized || Platform.OS !== 'android') return;
  try {
    await Promise.all([
      notifee.createChannel({
        id: CHANNELS.PRESENCE_ALARM,
        name: '🛡️ Presence Alerts',
        description: 'Urgent safety alerts — someone nearby needs a witness',
        importance: AndroidImportance.HIGH,
        sound: 'presence_alarm',
        vibration: true,
        vibrationPattern: [100, 400, 200, 400, 200, 600],
        lights: true,
        lightColor: AndroidColor.RED,
        badge: true,
        bypassDnd: true,
        visibility: AndroidVisibility.PUBLIC,
      }),

      notifee.createChannel({
        id: CHANNELS.HELP_ALARM,
        name: '🤝 Help Requests',
        description: 'Someone Nearby Needs Your Help',
        importance: AndroidImportance.HIGH,
        sound: 'help_request',
        vibration: true,
        vibrationPattern: [100, 300, 150, 300],
        lights: true,
        lightColor: '#3b82f6',
        badge: true,
        visibility: AndroidVisibility.PUBLIC,
      }),

      notifee.createChannel({
        id: CHANNELS.UPDATES,
        name: '📌 Socius Updates',
        description: 'Request updates, closures, and important activity',
        importance: AndroidImportance.HIGH,
        lights: true,
        badge: true,
        visibility: AndroidVisibility.PUBLIC,
      }),
    ]);

    initialized = true;
  } catch (e) {
    console.error('[Notifee] Channel init failed:', e);
  }
};

export const handleIncomingCallMessage = async (remoteMessage) => {
  if (!remoteMessage || Platform.OS !== 'android') return false;

  const data = remoteMessage.data || {};
  const rawType = data.type;
  const type = typeof rawType === 'string' ? rawType.toUpperCase() : '';

  try {
    console.log('[FCM] handleIncomingCallMessage type', type, data);
    
    if (type === 'CANCEL_ALARM') {
      const requestId = data.requestId;
      if (requestId) {
        console.log('[FCM] Cancelling alarm for requestId:', requestId);
        NativeCallService.cancelCallNotification(requestId);
      }
      return true;
    }

    if (SOCIUS_DATA_UPDATE_TYPES.has(type)) {
      await initNotifeeChannels();
      await displaySociusUpdateNotification(data);
      return true;
    }

    if (type.includes('REQUEST_REMATCHED')) {
      await initNotifeeChannels();
      try {
        const auth = await loadAuth();
        if (auth?.accessToken && data.requestId) {
          markRequestDelivered(auth.accessToken, data.requestId).catch(() => {});
        }
      } catch (err) {
        console.log('Auth load failed in rematch notification', err);
      }
      const category = data.category || 'General Support';
      const categoryName = data.categoryName || '';
      const categoryIcon = data.categoryIcon || '';
      const description = data.description || '';
      const distanceMeters = parseInt(data.distanceMeters || '0', 10) || 0;
      const area = data.area || '';
      await showHelpAlarm({
        requestId: data.requestId || '',
        category,
        categoryName,
        categoryIcon,
        description,
        distanceMeters,
        area,
        trustSignals: [],
        trustEmojis: [],
        userImage: null,
      });
      return true;
    }

    if (type.includes('PRESENCE')) {
      const requestId = data.requestId || '';
      const situation = data.situation || 'Safety concern';
      const distanceMeters = parseInt(data.distanceMeters || '0', 10) || 0;
      const area = data.area || '';
      const userImage = data.userImage || null;

      await showPresenceAlarm({
        requestId,
        situation,
        distanceMeters,
        area,
        userImage,
      });
      return true;
    }

    if (type.includes('HELP_REQUEST')) {
      const requestId = data.requestId || '';
      
      // Acknowledge receipt to backend
      try {
        const auth = await loadAuth();
        if (auth?.accessToken && requestId) {
          markRequestDelivered(auth.accessToken, requestId).catch(err => console.log('Mark delivered failed', err));
        }
      } catch (err) {
        console.log('Auth load failed in notification', err);
      }

      const category = data.category || 'General Support';
      const categoryName = data.categoryName || '';
      const categoryIcon = data.categoryIcon || '';
      const description = data.description || '';
      const distanceMeters = parseInt(data.distanceMeters || '0', 10) || 0;
      const area = data.area || '';
      const userImage = data.userImage || null;

      const trustSignals = [];
      const trustEmojis = [];

      Object.keys(data).forEach((key) => {
        if (key.startsWith('trustSignals_')) {
          const index = Number(key.split('_')[1]);
          if (!Number.isNaN(index)) {
            trustSignals[index] = data[key];
          }
        }
        if (key.startsWith('trustEmojis_')) {
          const index = Number(key.split('_')[1]);
          if (!Number.isNaN(index)) {
            trustEmojis[index] = data[key];
          }
        }
      });

      await showHelpAlarm({
        requestId,
        category,
        categoryName,
        categoryIcon,
        description,
        distanceMeters,
        area,
        trustSignals: trustSignals.filter(Boolean),
        trustEmojis: trustEmojis.filter(Boolean),
        userImage,
      });
      return true;
    }

  } catch (e) {
    console.error('[FCM] handleIncomingCallMessage failed:', e, data);
  }

  return false;
};

// ... existing imports ...

export const showPresenceAlarm = async ({
  requestId,
  situation = 'Safety concern',
  distanceMeters = 0,
  area = '',
  userImage = null,
}) => {
  // Use Native Module for CallStyle notification (Red/Green buttons)
  const distanceText = distanceMeters < 1000
    ? `${distanceMeters}m away`
    : `${(distanceMeters / 1000).toFixed(1)}km away`;

  const info = `${area} · ${distanceText}`;

  const payload = JSON.stringify({
    type: 'PRESENCE_ALARM',
    requestId,
    situation,
    distanceMeters: String(distanceMeters),
    area,
  });

  NativeCallService.displayIncomingCall(
    requestId,
    'Someone Nearby Feels Unsafe',
    info,
    userImage,
    payload
  );

  return requestId;
};

export const showHelpAlarm = async ({
  requestId,
  category = 'General Support',
  categoryName = '',
  categoryIcon = '',
  description = '',
  distanceMeters = 0,
  area = '',
  trustSignals = [],
  trustEmojis  = [],
  userImage = null,
}) => {
  // Use Native Module for CallStyle notification
  const distanceText = distanceMeters < 1000
    ? `${distanceMeters}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

  const root = String(baseURL || '').replace(/\/api\/?$/, '');
  const iconUri = categoryIcon ? `${root}${categoryIcon}` : null;
  const displayCategory = String(categoryName || category || 'Help Request')
    .replace(/_/g, ' ')
    .toUpperCase();
  const displayArea = String(area || '').trim();
  const displayDistance = String(distanceText || '').trim();
  const displayInfo = [displayArea, displayDistance].filter(Boolean).join(' · ');
  const snippet = String(description || '').trim().replace(/\s+/g, ' ').slice(0, 64);
  const info = [displayCategory, snippet, displayInfo].filter(Boolean).join('\n');

  const payload = JSON.stringify({
    type: 'HELP_REQUEST',
    requestId,
    category,
    categoryName,
    categoryIcon,
    description,
    distanceMeters: String(distanceMeters),
    area,
  });

  NativeCallService.displayIncomingCall(
    requestId,
    'Help Request',
    info,
    iconUri || userImage,
    payload
  );
};

export const cancelPresenceAlarm = async (requestId) => {
  NativeCallService.cancelCallNotification(requestId);
  await notifee.cancelNotification(`presence_${requestId}`);
};

export const cancelHelpAlarm = async (requestId) => {
  NativeCallService.cancelCallNotification(requestId);
  await notifee.cancelNotification(`help_${requestId}`);
};

export const cancelAllSociusNotifs = async () => {
  // Can't easily cancel all native calls without tracking IDs, 
  // but usually there's only one call at a time.
  await notifee.cancelAllNotifications();
};
