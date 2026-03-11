import axios from 'axios';
import { Platform } from 'react-native';

// Use environment variable if available (from .env or injected by start script)
const LOCAL_API = process.env.EXPO_PUBLIC_API_BASE_URL;
const LIVE_API = 'https://socius-platform-rxjo.onrender.com/api';

const baseURL = LOCAL_API || LIVE_API;

console.log(`API Base URL (${__DEV__ ? 'DEV' : 'PRODUCTION'}):`, baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { api, baseURL };
