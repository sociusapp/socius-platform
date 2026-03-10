// src/state/redux/slices/authSlice.js
// Authentication state management

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoggedIn: false,
  userRole: null, // 'USER', 'VOLUNTEER', 'ADMIN'
  user: {
    id: null,
    phone: null,
    name: null,
    email: null,
    profilePicture: null,
  },
  token: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Start login
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },

    // Login success
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isLoggedIn = true;
      state.user = action.payload.user;
      state.userRole = action.payload.role;
      state.token = action.payload.token;
      state.error = null;
    },

    // Login failure
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Set auth state (for restoring from storage)
    setAuthState: (state, action) => {
      state.isLoggedIn = action.payload.isLoggedIn;
      state.userRole = action.payload.userRole;
      state.user = action.payload.user || state.user;
      state.token = action.payload.token || state.token;
    },

    // Update user profile
    updateProfile: (state, action) => {
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },

    // Logout
    logout: (state) => {
      state.isLoggedIn = false;
      state.userRole = null;
      state.user = initialState.user;
      state.token = null;
      state.error = null;
      state.loading = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set loading
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    // Set error
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  setAuthState,
  updateProfile,
  logout,
  clearError,
  setLoading,
  setError,
} = authSlice.actions;

export default authSlice.reducer;