/**
 * Expo app config (replaces app.json). Splash: same asset for top-level splash + expo-splash-screen plugin.
 */
const SPLASH_IMAGE = './src/assets/icons/icon-03.png';
const INVISIBLE_SPLASH = './src/assets/splash/splash-invisible.png';

export default {
  name: 'Socius',
  slug: 'Socius',
  scheme: 'socius',
  userInterfaceStyle: 'light',
  version: '1.0.0',
  newArchEnabled: true,
  orientation: 'portrait',
  icon: SPLASH_IMAGE,
  splash: {
    image: INVISIBLE_SPLASH,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  plugins: [
    [
      'expo-av',
      {
        microphonePermission: 'Allow Socius to record voice messages in chat.',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: INVISIBLE_SPLASH,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        imageWidth: 240,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Socius to access your photos to upload verification documents.',
        cameraPermission: 'Allow Socius to access your camera to take a selfie for verification.',
      },
    ],
  ],
  android: {
    package: 'com.socius.app',
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
    adaptiveIcon: {
      foregroundImage: SPLASH_IMAGE,
      backgroundColor: '#FFFFFF',
    },
    config: {
      googleMaps: {
        apiKey: 'AIzaSyBkxg3G-lBNkM0rkPYd6ux0aZYnGowYQ3Y',
      },
    },
  },
  androidStatusBar: {
    backgroundColor: '#FFFFFF',
    barStyle: 'dark-content',
    translucent: true,
  },
  ios: {
    bundleIdentifier: 'com.socius.app',
    infoPlist: {
      NSMicrophoneUsageDescription: 'Socius records short voice messages to send in chat.',
      NSLocationWhenInUseUsageDescription: 'Socius uses your location when you choose to share it in chat.',
    },
  },
  extra: {
    eas: {
      projectId: '2c92264d-4bc5-4719-a333-d0001f386d3d',
    },
  },
  runtimeVersion: '1.0.0',
};
