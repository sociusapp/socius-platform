import { io } from 'socket.io-client';
import { loadAuth } from '../storage/asyncStorage.service';
import { baseURL } from '../api/client';

let socket = null;

// Simple custom EventEmitter for React Native (no Node.js dependencies)
class SimpleEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('EventEmitter error:', e);
      }
    });
  }
}

// Global event emitter for app-wide events (foreground notifications, etc.)
export const appEvents = new SimpleEventEmitter();

export const connectSocket = async () => {
  try {
    const auth = await loadAuth();
    const token = auth?.accessToken;

    if (!token) {
      console.log('Socket connect skipped: No token');
      return null;
    }

    if (socket && socket.connected) {
      console.log('Socket already connected');
      return socket;
    }

    // Initialize
    const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');
    socket = io(cleanBaseURL, {
      auth: {
        token,
      },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return socket;
  } catch (error) {
    console.error('Socket setup error:', error);
    return null;
  }
};

export const emitStatusUpdate = (requestId, status, data = {}) => {
  if (socket && socket.connected) {
    socket.emit('status_update', {
      requestId,
      status,
      ...data,
      timestamp: new Date().toISOString(),
    });
    console.log(`[Socket] Status update emitted: ${status} for ${requestId}`);
    return true;
  }
  return false;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected manually');
  }
};
