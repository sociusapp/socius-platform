import { io } from 'socket.io-client';
import { loadAuth } from '../storage/asyncStorage.service';
import { baseURL } from '../api/client';

let socket = null;

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
