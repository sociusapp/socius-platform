# 🚀 Quick Installation Guide

## Backend ✅ (Already Done)
```bash
cd socius-backend
npm install multer
```

## React Native (Run These Commands)

### Option 1: Copy & Paste (Fastest)
```bash
npm install react-native-device-info rn-fetch-blob
```

### Option 2: Use Script
```bash
./react-native-install.sh
```

### Option 3: Complete Install
```bash
npm install react-native-device-info rn-fetch-blob @react-native-community/netinfo react-native-permissions
```

## Android Setup (Must Do)

Add these permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Add to Your App

In your main `App.js`:
```javascript
import AppUpdateManager from './AppUpdateManager';

// At the bottom of your app return
return (
  <View>
    {/* Your existing app content */}
    <AppUpdateManager />
  </View>
);
```

## Test It

1. Build APK with versionCode 1
2. Build another APK with versionCode 2  
3. Upload version 2 to backend
4. Open app with version 1
5. Should show update modal! 🎉

## Done! 

Your in-app update system is ready! 🚀
