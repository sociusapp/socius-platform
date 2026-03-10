// src/state/hooks/useAuth.js
// Custom hook for auth state and actions

import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  setLoading,
} from '../redux/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  const handleLogin = async (phoneNumber, otp, role) => {
    dispatch(loginStart());
    try {
      // TODO: Call API to verify OTP and login
      // const response = await loginAPI(phoneNumber, otp);

      // Mock response
      const mockUser = {
        id: '123',
        phone: phoneNumber,
        name: 'User Name',
        email: `user${phoneNumber}@example.com`,
      };

      const mockToken = 'mock_token_' + Date.now();

      // Save to AsyncStorage
      await AsyncStorage.setItem('authToken', mockToken);
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('userId', mockUser.id);

      // Dispatch success
      dispatch(
        loginSuccess({
          user: mockUser,
          role: role,
          token: mockToken,
        })
      );

      return true;
    } catch (error) {
      dispatch(loginFailure(error.message || 'Login failed'));
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userId');

      // Dispatch logout
      dispatch(logout());
      return true;
    } catch (error) {
      console.log('Logout error:', error);
      return false;
    }
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return {
    // State
    isLoggedIn: auth.isLoggedIn,
    userRole: auth.userRole,
    user: auth.user,
    token: auth.token,
    loading: auth.loading,
    error: auth.error,

    // Actions
    handleLogin,
    handleLogout,
    handleClearError,
    setLoading: (isLoading) => dispatch(setLoading(isLoading)),
  };
};