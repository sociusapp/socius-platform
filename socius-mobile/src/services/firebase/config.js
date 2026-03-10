import { getMessaging, requestPermission, getToken, AuthorizationStatus } from '@react-native-firebase/messaging';
import { getApps, initializeApp } from '@react-native-firebase/app';

const ensureFirebaseInitialized = () => {
  if (getApps().length === 0) {
    initializeApp();
  }
};

const getFcmToken = async () => {
  ensureFirebaseInitialized();
  const messaging = getMessaging();
  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    return null;
  }

  const token = await getToken(messaging);
  return token;
};

export { ensureFirebaseInitialized, getFcmToken };
