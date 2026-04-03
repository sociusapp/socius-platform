# 📦 Complete Package Installation Guide

## Backend (Node.js) Packages ✅

Already installed:
```bash
cd socius-backend
npm install multer
```

**Purpose:** File upload handling for APK uploads

---

## React Native Packages

### Core Required Packages:
```bash
npm install react-native-device-info rn-fetch-blob
```

**Details:**
- `react-native-device-info` - Get app version, device info
- `rn-fetch-blob` - Download APK files, handle file operations

### Optional but Recommended:
```bash
npm install @react-native-community/netinfo react-native-permissions
```

**Details:**
- `@react-native-community/netinfo` - Check internet connection
- `react-native-permissions` - Handle Android permissions

---

## Installation Commands

### Option 1: Quick Install (Core packages only)
```bash
npm install react-native-device-info rn-fetch-blob
```

### Option 2: Complete Install (Recommended)
```bash
npm install react-native-device-info rn-fetch-blob @react-native-community/netinfo react-native-permissions
```

### Option 3: Use Script (Easiest)
```bash
# Run the installation script
./react-native-install.sh
```

---

## iOS Setup (if applicable)

After installing packages:
```bash
cd ios
pod install
cd ..
```

---

## Android Setup Required

After package installation, you MUST:

### 1. AndroidManifest.xml permissions
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### 2. build.gradle configuration
In `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 1  // Increment this for each release
        versionName "1.0.0"
    }
}
```

### 3. ProGuard rules (if using ProGuard)
Add to `android/app/proguard-rules.pro`:
```
-keep class com RNFetchBlob { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
```

---

## Package Sizes

- `react-native-device-info`: ~50KB
- `rn-fetch-blob`: ~200KB  
- `@react-native-community/netinfo`: ~80KB
- `react-native-permissions`: ~100KB

**Total:** ~430KB (very reasonable)

---

## Verification

After installation, verify packages are in package.json:

```json
{
  "dependencies": {
    "react-native-device-info": "^10.13.0",
    "rn-fetch-blob": "^0.12.0",
    "@react-native-community/netinfo": "^9.4.1",
    "react-native-permissions": "^3.10.1"
  }
}
```

---

## Troubleshooting

### Common Issues:

1. **rn-fetch-blob installation fails**
   ```bash
   npm install rn-fetch-blob --save
   cd android && ./gradlew clean && cd ..
   ```

2. **iOS pod install issues**
   ```bash
   cd ios
   pod deintegrate
   pod install
   cd ..
   ```

3. **Permission issues on Android**
   - Make sure all permissions are added to AndroidManifest.xml
   - Check if target SDK is correct

### Clean Install:
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
cd ios && pod install && cd ..
```

---

## Next Steps After Installation

1. ✅ Packages installed
2. ✅ Android permissions added  
3. ✅ AppUpdateManager added to App.js
4. ✅ Backend API tested
5. ✅ Build APK and test update flow

You're ready to test the in-app update system! 🚀
