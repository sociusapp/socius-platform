import axios from 'axios';
import { Platform } from 'react-native';

// Use environment variable if available (e.g., from .env) or fallback to local IP
// Note: 192.168.1.79 is your machine's local IP which works for both emulators and physical devices
const LOCAL_API = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.79:48080/api';
const LIVE_API = 'https://socius-platform.onrender.com/api';

// __DEV__ is true in Expo dev, false in APK/production build
const baseURL = __DEV__ ? LOCAL_API : LIVE_API;

console.log(`API Base URL (${__DEV__ ? 'DEV' : 'PRODUCTION'}):`, baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { api, baseURL };
