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

const verifyOtp = ({ phone, otp, deviceToken, platform, deviceId, deviceModel, appVersion }) => {
  return api
    .post('/auth/verify-otp', {
      phone,
      otp,
      deviceToken,
      platform,
      deviceId,
      deviceModel,
      appVersion,
    })
    .then((response) => response.data);
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
