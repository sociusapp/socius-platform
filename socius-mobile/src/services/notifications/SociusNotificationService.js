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
