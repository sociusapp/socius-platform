import {
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification as getInitialNotificationMsg,
  subscribeToTopic as subscribeToTopicMsg,
  unsubscribeFromTopic as unsubscribeFromTopicMsg
} from '@react-native-firebase/messaging';
import { AppState } from 'react-native';

let messaging = null;
let firebaseInitFailed = false;
let loggedOnce = false;

const logOnce = (message) => {
  if (!loggedOnce) {
    console.log(message);
    loggedOnce = true;
  }
};

const getMessagingInstance = () => {
  if (messaging) return messaging;
  try {
    messaging = getMessaging();
    return messaging;
  } catch (error) {
    logOnce('[Firebase Messaging] Not initialized - config missing');
    firebaseInitFailed = true;
    return null;
  }
};

const onMessageForeground = (handler) => {
  const msg = getMessagingInstance();
  if (!msg || firebaseInitFailed) {
    // Silently skip
    return () => {};
  }
  return onMessage(msg, (remoteMessage) => {
    console.log('[FCM] onMessage foreground raw', remoteMessage?.data || remoteMessage);
    handler(remoteMessage);
  });
};

const onNotificationOpened = (handler) => {
  const msg = getMessagingInstance();
  if (!msg || firebaseInitFailed) {
    // Silently skip
    return () => {};
  }
  return onNotificationOpenedApp(msg, (remoteMessage) => {
    handler(remoteMessage);
  });
};

const getInitialNotification = () => {
  const msg = getMessagingInstance();
  if (!msg || firebaseInitFailed) {
    // Silently skip
    return Promise.resolve(null);
  }
  return getInitialNotificationMsg(msg);
};

const subscribeToTopic = (topic) => {
  const msg = getMessagingInstance();
  if (!msg || firebaseInitFailed) {
    // Silently skip
    return Promise.resolve();
  }
  return subscribeToTopicMsg(msg, topic);
};

const unsubscribeFromTopic = (topic) => {
  const msg = getMessagingInstance();
  if (!msg || firebaseInitFailed) {
    // Silently skip
    return Promise.resolve();
  }
  return unsubscribeFromTopicMsg(msg, topic);
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
