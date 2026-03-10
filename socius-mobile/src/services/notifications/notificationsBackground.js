import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { handleIncomingCallMessage } from './SociusNotificationService';

const messaging = getMessaging();

setBackgroundMessageHandler(messaging, async remoteMessage => {
  console.log('[FCM] background message', remoteMessage?.data || remoteMessage);
  await handleIncomingCallMessage(remoteMessage);
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
