import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_ROLE_KEY = 'userRole';
const USER_ID_KEY = 'userId';
const AVAILABILITY_PREFERENCE_KEY = 'availabilityPreference.isAvailable';

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
  ]);
};

const saveAvailabilityPreference = async (isAvailable) => {
  await AsyncStorage.setItem(AVAILABILITY_PREFERENCE_KEY, isAvailable ? '1' : '0');
};

const loadAvailabilityPreference = async () => {
  const value = await AsyncStorage.getItem(AVAILABILITY_PREFERENCE_KEY);
  if (value === null) return null;
  return value === '1' || value === 'true';
};

export { saveAuth, loadAuth, clearAuth, saveAvailabilityPreference, loadAvailabilityPreference };
