import { PermissionsAndroid, Platform } from 'react-native';

let firebaseModule = null;
let messagingModule = null;
let firebaseInitFailed = false;
let loggedOnce = false;

const logOnce = (message) => {
  if (!loggedOnce) {
    console.log(message);
    loggedOnce = true;
  }
};

// Lazy load Firebase modules to prevent crash when native module not found
const getFirebaseModules = () => {
  if (firebaseModule && messagingModule) {
    return { firebaseModule, messagingModule };
  }

  try {
    const { getApps, initializeApp } = require('@react-native-firebase/app');
    const { getMessaging, requestPermission, getToken, AuthorizationStatus } = require('@react-native-firebase/messaging');
    
    firebaseModule = { getApps, initializeApp };
    messagingModule = { getMessaging, requestPermission, getToken, AuthorizationStatus };
    
    return { firebaseModule, messagingModule };
  } catch (error) {
    if (!firebaseInitFailed) {
      logOnce('[Firebase] Native module not found - config missing');
      firebaseInitFailed = true;
    }
    return null;
  }
};

const ensureFirebaseInitialized = () => {
  const modules = getFirebaseModules();
  if (!modules || firebaseInitFailed) return false;

  try {
    const { getApps, initializeApp } = modules.firebaseModule;
    if (getApps().length === 0) {
      try {
        initializeApp();
        return true;
      } catch (initError) {
        logOnce('[Firebase] Initialization failed - native error');
        firebaseInitFailed = true;
        return false;
      }
    }
    return true;
  } catch (error) {
    logOnce('[Firebase] Initialization skipped - config missing');
    firebaseInitFailed = true;
    return false;
  }
};

const getFcmToken = async () => {
  const isInitialized = ensureFirebaseInitialized();
  
  if (!isInitialized || firebaseInitFailed) {
    return null;
  }

  const modules = getFirebaseModules();
  if (!modules) {
    return null;
  }

  const { getMessaging, requestPermission, getToken, AuthorizationStatus } = modules.messagingModule;
  
  let messaging;
  try {
    messaging = getMessaging();
  } catch (e) {
    logOnce('[Firebase] getMessaging failed');
    return null;
  }

  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch (e) { }
  }

  try {
    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      return null;
    }

    const token = await getToken(messaging);
    return token;
  } catch (e) {
    return null;
  }
};

export { ensureFirebaseInitialized, getFcmToken };
