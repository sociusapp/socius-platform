import axios from 'axios';
import { Platform } from 'react-native';

// Use environment variable if available (from .env or injected by start script)
const LOCAL_API = process.env.EXPO_PUBLIC_API_BASE_URL;
const LIVE_API = 'https://socius-platform-rxjo.onrender.com/api';

// Fallback logic: If LOCAL_API is missing, we shouldn't hardcode one that might change
// The start script now injects this automatically.
const baseURL = __DEV__ ? (LOCAL_API || 'http://localhost:48080/api') : LIVE_API;

console.log(`API Base URL (${__DEV__ ? 'DEV' : 'PRODUCTION'}):`, baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { api, baseURL };
