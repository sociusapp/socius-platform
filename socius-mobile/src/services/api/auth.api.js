import { api } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const sendOtp = (phone, countryCode = '+91') => {
  return api
    .post('/auth/send-otp', { phone, countryCode })
    .then((response) => response.data);
};

const verifyOtp = ({ phone, countryCode, otp, deviceToken, platform, deviceId, deviceModel, appVersion }) => {
  console.log('[Auth API] verifyOtp called with:', { phone, countryCode, otp, hasDeviceToken: !!deviceToken });
  
  return api
    .post('/auth/verify-otp', {
      phone,
      countryCode,
      otp,
      deviceToken,
      platform,
      deviceId,
      deviceModel,
      appVersion,
    })
    .then((response) => {
      console.log('[Auth API] verifyOtp success:', response.data);
      return response.data;
    })
    .catch((error) => {
      console.error('[Auth API] verifyOtp error:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
      });
      throw error;
    });
};

const logout = (token, deviceToken) => {
  return api
    .post('/auth/logout', { deviceToken }, authConfig(token))
    .then((response) => response.data);
};

const getDeviceTokenStatus = (token) => {
  return api
    .get('/auth/device-token', authConfig(token))
    .then((response) => response.data);
};

const updateDeviceToken = (token, { deviceToken, platform, deviceId, deviceModel, appVersion }) => {
  return api
    .post(
      '/auth/device-token',
      { deviceToken, platform, deviceId, deviceModel, appVersion },
      authConfig(token)
    )
    .then((response) => response.data);
};

export { sendOtp, verifyOtp, logout, getDeviceTokenStatus, updateDeviceToken };
