import {
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification as getInitialNotificationMsg,
  subscribeToTopic as subscribeToTopicMsg,
  unsubscribeFromTopic as unsubscribeFromTopicMsg
} from '@react-native-firebase/messaging';
import { AppState } from 'react-native';

const messaging = getMessaging();

const onMessageForeground = (handler) => {
  return onMessage(messaging, (remoteMessage) => {
    console.log('[FCM] onMessage foreground raw', remoteMessage?.data || remoteMessage);
    handler(remoteMessage);
  });
};

const onNotificationOpened = (handler) => {
  return onNotificationOpenedApp(messaging, (remoteMessage) => {
    handler(remoteMessage);
  });
};

const getInitialNotification = () => {
  return getInitialNotificationMsg(messaging);
};

const subscribeToTopic = (topic) => {
  return subscribeToTopicMsg(messaging, topic);
};

const unsubscribeFromTopic = (topic) => {
  return unsubscribeFromTopicMsg(messaging, topic);
};

const registerAppStateListener = (handler) => {
  const subscription = AppState.addEventListener('change', handler);
  return () => subscription.remove();
};

export {
  onMessageForeground,
  onNotificationOpened,
  getInitialNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  registerAppStateListener,
};
