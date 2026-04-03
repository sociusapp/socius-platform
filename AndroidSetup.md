# Android Setup for In-App Updates

## 1. AndroidManifest.xml Permissions

Add these permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />
    
    <application>
        <!-- Your existing application code -->
    </application>
</manifest>
```

## 2. ProGuard Rules (if using ProGuard)

Add to `android/app/proguard-rules.pro`:

```
-keep class com RNFetchBlob { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
```

## 3. build.gradle Configuration

In `android/app/build.gradle`, make sure you have:

```gradle
android {
    compileSdkVersion rootProject.ext.compileSdkVersion

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    defaultConfig {
        applicationId "com.sociusapp"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1  // Increment this for each release
        versionName "1.0.0"
    }
}
```

## 4. File Provider Setup (Android 11+)

Create `android/app/src/main/res/xml/file_paths.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="."/>
    <external-cache-path name="external_cache" path="."/>
</paths>
```

In `AndroidManifest.xml`, add FileProvider:

```xml
<application>
    <provider
        android:name="androidx.core.content.FileProvider"
        android:authorities="${applicationId}.fileprovider"
        android:exported="false"
        android:grantUriPermissions="true">
        <meta-data
            android:name="android.support.FILE_PROVIDER_PATHS"
            android:resource="@xml/file_paths" />
    </provider>
</application>
```

## 5. Testing the Update System

### Step 1: Create Test APK
```bash
# Build APK with versionCode 1
cd android
./gradlew assembleRelease

# Copy APK to backend uploads folder
cp app/build/outputs/apk/release/app-release.apk ../socius-backend/src/uploads/app-latest.apk
```

### Step 2: Update Backend
- Update versionCode in `appUpdate.routes.js` to 2
- Place new APK in uploads folder
- Restart backend server

### Step 3: Test Update Flow
1. Install version 1 APK on device
2. Open app - should show update modal
3. Click "Update Now"
4. Allow permissions if prompted
5. Install new version
6. App should update successfully

## 6. Version Management

Always increment `versionCode` in both:
- React Native: `android/app/build.gradle`
- Backend: `src/routes/appUpdate.routes.js`

Example:
```javascript
// Backend
const updateInfo = {
  versionCode: 2, // Increment this
  versionName: '1.1.0',
  // ...
};

// Android build.gradle
defaultConfig {
    versionCode 2  // Same as backend
    versionName "1.1.0"
}
```

## 7. Security Notes

- Always use same signing key for all APK versions
- Use HTTPS in production for APK downloads
- Validate APK integrity on server side
- Consider using checksum verification for large files

## 8. Troubleshooting

### "Install Anywhere" Error
- User needs to enable "Install from Unknown Sources"
- Add clear instructions in your app
- Consider providing step-by-step guide

### Download Fails
- Check internet connection
- Verify APK URL is accessible
- Check server permissions
- Monitor download progress

### App Won't Install
- Verify same signing key used
- Check versionCode is higher than current
- Ensure sufficient device storage
- Check Android version compatibility
