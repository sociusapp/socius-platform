import { getMessaging, requestPermission, getToken, AuthorizationStatus } from '@react-native-firebase/messaging';
import { getApps, initializeApp } from '@react-native-firebase/app';
import { PermissionsAndroid, Platform } from 'react-native';

const ensureFirebaseInitialized = () => {
  if (getApps().length === 0) {
    initializeApp();
  }
};

const getFcmToken = async () => {
  ensureFirebaseInitialized();
  const messaging = getMessaging();

  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch (e) { }
  }

  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    try {
      const token = await getToken(messaging);
      return token;
    } catch (e) {
      return null;
    }
  }

  const token = await getToken(messaging);
  return token;
};

export { ensureFirebaseInitialized, getFcmToken };
