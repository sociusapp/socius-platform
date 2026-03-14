import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import { CHANNELS, handleIncomingCallMessage, initNotifeeChannels } from './SociusNotificationService';
import { buildClosureInitiatedCopy, buildRequestClosedCopy } from '../../utils/closureMessages';

const messaging = getMessaging();

setBackgroundMessageHandler(messaging, async remoteMessage => {
  console.log('[FCM] background message', remoteMessage?.data || remoteMessage);
  const handledByCallKeep = await handleIncomingCallMessage(remoteMessage);
  if (handledByCallKeep) return;

  const data = remoteMessage?.data || {};
  const type = String(data.type || '').toLowerCase();
  if (type !== 'request_status') return;

  const status = String(data.status || '').toLowerCase();
  const requestId = String(data.requestId || '');
  if (!status || !requestId) return;

  await initNotifeeChannels();

  let title = 'Update'
  let body = ''

  if (status === 'matched') {
    title = 'Match found'
    body = 'A volunteer accepted your request. Tap to open.'
  } else if (status === 'closing') {
    const copy = buildClosureInitiatedCopy({
      requestId,
      requestType: data.requestType || 'Help request',
      initiatedBy: data.initiatedBy,
      occurredAt: data.occurredAt,
    });
    title = copy.title
    body = copy.message
  } else if (status === 'closed') {
    const copy = buildRequestClosedCopy({
      requestId,
      requestType: data.requestType || 'Help request',
      reason: data.reason,
      occurredAt: data.occurredAt,
    });
    title = copy.title
    body = copy.message
  } else {
    title = 'Request update'
    body = 'Tap to open Socius.'
  }

  try {
    await notifee.displayNotification({
      id: `update:${status}:${requestId}`,
      title,
      body,
      android: {
        channelId: CHANNELS.UPDATES,
        pressAction: { id: 'default' },
        style: { type: AndroidStyle.BIGTEXT, text: body },
      },
      data: { ...data, type: 'request_status', status, requestId },
    });
  } catch (e) {}
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  if (!notification || !pressAction) {
    return;
  }

  if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    await notifee.cancelNotification(notification.id);
  }
});
