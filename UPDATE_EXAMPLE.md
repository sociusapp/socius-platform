# 🚀 Complete Update Process Example

## Step 1: Build Current APK (Version 1.0.0)

### 1.1 Update build.gradle
```gradle
// android/app/build.gradle
android {
    defaultConfig {
        applicationId "com.sociusapp"
        versionCode 1  // Current version
        versionName "1.0.0"
        minSdkVersion 21
        targetSdkVersion 33
    }
}
```

### 1.2 Build APK
```bash
cd android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

### 1.3 Install on Device
- Transfer APK to phone
- Install and test basic functionality
- This is your "current version"

---

## Step 2: Make Changes & Build New APK (Version 1.1.0)

### 2.1 Make Some Changes
```javascript
// Example: Add a new feature or fix a bug
// src/components/HomeScreen.js

const HomeScreen = () => {
  return (
    <View>
      <Text style={{color: 'orange'}}>🚀 Updated App v1.1.0!</Text>
      <Text>New feature added!</Text>
    </View>
  );
};
```

### 2.2 Update Version in build.gradle
```gradle
// android/app/build.gradle
android {
    defaultConfig {
        versionCode 2  // Increment this!
        versionName "1.1.0"  // Update this!
    }
}
```

### 2.3 Build New APK
```bash
cd android
./gradlew clean
./gradlew assembleRelease

# New APK at:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## Step 3: Upload to Backend

### 3.1 Copy APK to Backend
```bash
# Copy the new APK to backend uploads folder
cp android/app/build/outputs/apk/release/app-release.apk ../socius-backend/src/uploads/app-latest.apk
```

### 3.2 Update Backend Config
```javascript
// Update socius-backend/src/routes/appUpdate.routes.js
// OR use admin upload API

const updateInfo = {
  versionCode: 2,  // Must match build.gradle
  versionName: "1.1.0",  // Must match build.gradle
  isForceUpdate: false,  // Optional update
  releaseNotes: [
    "🚀 Faster loading speed",
    "🐛 Fixed login issues",
    "🌙 Added dark mode",
    "✨ New home screen design"
  ],
  fileSize: "26.1 MB"
};
```

### 3.3 Test Backend API
```bash
# Test if backend is serving new version
curl "http://127.0.0.1:48080/api/app-update/check-update?version=1"

# Should return versionCode: 2 (higher than current 1)
```

---

## Step 4: Test Update Flow

### 4.1 Open Old App (Version 1.0.0)
- Open the app with versionCode 1
- AppUpdateManager will automatically check for updates
- Should show modal: "🚀 App Update Available!"

### 4.2 Update Modal Should Show:
```
┌─────────────────────────────┐
│  🚀 App Update Available!   │
│      Version 1.1.0          │
│                             │
│  What's New:                │
│  ✅ Faster loading speed    │
│  ✅ Fixed login issues      │
│  ✅ Added dark mode         │
│  ✨ New home screen design  │
│                             │
│  Size: 26.1 MB              │
│                             │
│    [🔥 Update Now]          │
│      [ Later ]              │
│    📖 How to Install?       │
└─────────────────────────────┘
```

### 4.3 Click "Update Now"
- Download starts with progress bar
- Progress: ████████████░░ 80%
- Download completes

### 4.4 Install
- Android prompts: "Install update?"
- Click "Install"
- App updates to version 1.1.0
- App restarts with new features!

---

## Step 5: Verify Update

### 5.1 Check App Version
```javascript
// In your app, check current version
import DeviceInfo from 'react-native-device-info';

const checkVersion = async () => {
  const version = await DeviceInfo.getBuildNumber(); // Should return "2"
  const versionName = await DeviceInfo.getVersion(); // Should return "1.1.0"
  console.log('Current version:', version, versionName);
};
```

### 5.2 Test New Features
- Verify new features are working
- Check if old data is preserved
- Make sure no crashes occur

---

## Step 6: Next Update (Version 1.2.0)

### 6.1 Make More Changes
```javascript
// Add another feature
const NewFeature = () => {
  return <Text>🎉 Another new feature in v1.2.0!</Text>;
};
```

### 6.2 Update Version Again
```gradle
// android/app/build.gradle
android {
    defaultConfig {
        versionCode 3  // Increment to 3
        versionName "1.2.0"  // Update to 1.2.0
    }
}
```

### 6.3 Repeat Process
- Build new APK
- Upload to backend
- Test update flow

---

## 🎯 Quick Commands Reference

### Build APK:
```bash
cd android && ./gradlew assembleRelease
```

### Copy to Backend:
```bash
cp android/app/build/outputs/apk/release/app-release.apk ../socius-backend/src/uploads/app-latest.apk
```

### Test API:
```bash
curl "http://127.0.0.1:48080/api/app-update/check-update?version=CURRENT_VERSION"
```

### Restart Backend:
```bash
cd socius-backend && npm run dev
```

---

## 🔥 Pro Tips

### Version Management:
- Always increment `versionCode` (must be integer)
- Update `versionName` (user-friendly version)
- Keep both in sync between backend and app

### Force Updates:
```javascript
// For critical security updates
const updateInfo = {
  versionCode: 3,
  isForceUpdate: true,  // User cannot skip this update
  releaseNotes: ["🔒 Critical security fix"]
};
```

### Testing:
- Test with both WiFi and mobile data
- Test on different Android versions
- Test permission handling

---

## 🎉 Success! 

Your in-app update system is now working! Users will get seamless updates without Play Store! 🚀

## 📞 Troubleshooting

### Update not showing?
- Check versionCode is higher than current
- Verify backend API is accessible
- Check internet connection

### Download failing?
- Check APK URL is accessible
- Verify file permissions
- Check available storage

### Install failing?
- Check if same signing key used
- Verify "Unknown Sources" permission
- Check available storage

---

**Ready to roll out updates to your users!** 🎯
