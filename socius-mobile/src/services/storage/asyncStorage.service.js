import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_ROLE_KEY = 'userRole';
const USER_ID_KEY = 'userId';
const AVAILABILITY_PREFERENCE_KEY = 'availabilityPreference.isAvailable';
const AVAILABILITY_UPDATED_AT_KEY = 'availabilityPreference.updatedAt';
const LAST_KNOWN_LOCATION_KEY = 'location.lastKnown.v1';
const ACTIVE_HELP_REQUEST_ID_KEY = 'request.active.help.id.v1';
const ACTIVE_PRESENCE_REQUEST_ID_KEY = 'request.active.presence.id.v1';

const saveAuth = async ({ accessToken, refreshToken, role, userId }) => {
  const tasks = [];
  if (accessToken) tasks.push(AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken));
  if (refreshToken) tasks.push(AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken));
  if (role) tasks.push(AsyncStorage.setItem(USER_ROLE_KEY, role));
  if (userId) tasks.push(AsyncStorage.setItem(USER_ID_KEY, String(userId)));
  await Promise.all(tasks);
};

const loadAuth = async () => {
  const [accessToken, refreshToken, role, userId] = await Promise.all([
    AsyncStorage.getItem(AUTH_TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    AsyncStorage.getItem(USER_ROLE_KEY),
    AsyncStorage.getItem(USER_ID_KEY),
  ]);

  return {
    accessToken,
    refreshToken,
    role,
    userId,
  };
};

const clearAuth = async () => {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(USER_ROLE_KEY),
    AsyncStorage.removeItem(USER_ID_KEY),
    AsyncStorage.removeItem(AVAILABILITY_PREFERENCE_KEY),
    AsyncStorage.removeItem(AVAILABILITY_UPDATED_AT_KEY),
    AsyncStorage.removeItem(ACTIVE_HELP_REQUEST_ID_KEY),
    AsyncStorage.removeItem(ACTIVE_PRESENCE_REQUEST_ID_KEY),
  ]);
};

const saveAvailabilityPreference = async (isAvailable) => {
  await Promise.all([
    AsyncStorage.setItem(AVAILABILITY_PREFERENCE_KEY, isAvailable ? '1' : '0'),
    AsyncStorage.setItem(AVAILABILITY_UPDATED_AT_KEY, String(Date.now())),
  ]);
};

const loadAvailabilityPreference = async () => {
  const value = await AsyncStorage.getItem(AVAILABILITY_PREFERENCE_KEY);
  if (value === null) return null;
  return value === '1' || value === 'true';
};

const loadAvailabilityUpdatedAt = async () => {
  const raw = await AsyncStorage.getItem(AVAILABILITY_UPDATED_AT_KEY);
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const saveLastKnownLocation = async ({ label, latitude, longitude, updatedAt }) => {
  const payload = {
    label: typeof label === 'string' ? label : null,
    latitude: typeof latitude === 'number' ? latitude : null,
    longitude: typeof longitude === 'number' ? longitude : null,
    updatedAt: typeof updatedAt === 'number' ? updatedAt : Date.now(),
  };
  await AsyncStorage.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify(payload));
};

const loadLastKnownLocation = async () => {
  const raw = await AsyncStorage.getItem(LAST_KNOWN_LOCATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const out = {
      label: typeof parsed.label === 'string' ? parsed.label : null,
      latitude: typeof parsed.latitude === 'number' ? parsed.latitude : null,
      longitude: typeof parsed.longitude === 'number' ? parsed.longitude : null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null,
    };
    if (out.label || (typeof out.latitude === 'number' && typeof out.longitude === 'number')) {
      return out;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const saveActiveHelpRequestId = async (requestId) => {
  if (!requestId) return;
  await AsyncStorage.setItem(ACTIVE_HELP_REQUEST_ID_KEY, String(requestId));
};

const loadActiveHelpRequestId = async () => {
  return AsyncStorage.getItem(ACTIVE_HELP_REQUEST_ID_KEY);
};

const clearActiveHelpRequestId = async () => {
  await AsyncStorage.removeItem(ACTIVE_HELP_REQUEST_ID_KEY);
};

const saveActivePresenceRequestId = async (requestId) => {
  if (!requestId) return;
  await AsyncStorage.setItem(ACTIVE_PRESENCE_REQUEST_ID_KEY, String(requestId));
};

const loadActivePresenceRequestId = async () => {
  return AsyncStorage.getItem(ACTIVE_PRESENCE_REQUEST_ID_KEY);
};

const clearActivePresenceRequestId = async () => {
  await AsyncStorage.removeItem(ACTIVE_PRESENCE_REQUEST_ID_KEY);
};

export {
  saveAuth,
  loadAuth,
  clearAuth,
  saveAvailabilityPreference,
  loadAvailabilityPreference,
  loadAvailabilityUpdatedAt,
  saveLastKnownLocation,
  loadLastKnownLocation,
  saveActiveHelpRequestId,
  loadActiveHelpRequestId,
  clearActiveHelpRequestId,
  saveActivePresenceRequestId,
  loadActivePresenceRequestId,
  clearActivePresenceRequestId,
};
