// src/state/redux/store.js
// Redux store configuration

import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';

// Temporary slices - will be filled later
const incidentReducer = (state = {}, action) => state;
const userReducer = (state = {}, action) => state;
const volunteerReducer = (state = {}, action) => state;
const adminReducer = (state = {}, action) => state;

export const store = configureStore({
  reducer: {
    auth: authSlice,
    incident: incidentReducer,
    user: userReducer,
    volunteer: volunteerReducer,
    admin: adminReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setAuthState', 'auth/loginSuccess'],
        ignoredPaths: ['auth.user'],
      },
    }),
});