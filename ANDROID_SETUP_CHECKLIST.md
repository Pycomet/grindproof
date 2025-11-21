# Android Setup Checklist

Complete guide for Android app configuration. Check off each item as you go!

## Prerequisites
- [ ] Android Studio installed (latest stable version)
- [ ] Java JDK 11 or later
- [ ] Node.js and Yarn installed
- [ ] Google account (free)

## Step 1: Initialize Android Platform
```bash
npx cap add android
```
- [ ] Command completed successfully
- [ ] `android/` folder created

## Step 2: Firebase Setup

### Create Firebase Project
1. [ ] Go to https://console.firebase.google.com/
2. [ ] Click "Add project"
3. [ ] Name: `Grindproof`
4. [ ] Disable Google Analytics (optional)
5. [ ] Click "Create project"

### Add Android App to Firebase
1. [ ] In Firebase Console, click "Add app" → Android
2. [ ] Android package name: `com.grindproof.app` (must match exactly!)
3. [ ] App nickname: `Grindproof Android`
4. [ ] Debug signing certificate: Leave empty for now
5. [ ] Click "Register app"
6. [ ] Download `google-services.json`

### Add google-services.json to Project
```bash
# Move downloaded file to:
cp ~/Downloads/google-services.json android/app/
```
- [ ] File placed at `android/app/google-services.json`
- [ ] Verify file is NOT committed to git (in .gitignore)

### Enable Firebase Cloud Messaging
1. [ ] In Firebase Console → Project Settings
2. [ ] Click "Cloud Messaging" tab
3. [ ] Note the Server Key (for backend integration)
4. [ ] Cloud Messaging API should be enabled

## Step 3: Open in Android Studio
```bash
yarn cap:open:android
```
- [ ] Android Studio opened with project
- [ ] Gradle sync started automatically
- [ ] Wait for Gradle sync to complete (may take a few minutes)

## Step 4: Configure Project Settings

### Verify Package Name
1. [ ] Open `android/app/build.gradle`
2. [ ] Find `applicationId`
3. [ ] Verify it's `"com.grindproof.app"`

### Verify Dependencies
In `android/app/build.gradle`, verify these are present:
```gradle
dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.0.0'
    // ... other dependencies
}
```
- [ ] Firebase dependencies present

### Verify Google Services Plugin
At bottom of `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```
- [ ] Plugin applied

In `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```
- [ ] Classpath present

## Step 5: Configure Android Manifest

Open `android/app/src/main/AndroidManifest.xml` and verify:

### Internet Permission
```xml
<uses-permission android:name="android.permission.INTERNET" />
```
- [ ] Internet permission present

### Notification Permission (Android 13+)
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```
- [ ] Notification permission present (or add it)

### Other Useful Permissions (optional)

**For camera:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

**For photo library:**
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

- [ ] Manifest configured

## Step 6: Set App Name and Icon

### App Name
In `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Grindproof</string>
<string name="title_activity_main">Grindproof</string>
<string name="package_name">com.grindproof.app</string>
```
- [ ] App name set

### App Icon (optional now, required for release)
- [ ] Replace icons in `android/app/src/main/res/mipmap-*/` folders
- [ ] Or use Android Studio: Right-click res → New → Image Asset

## Step 7: Configure Signing (for Release)

### Generate Keystore
```bash
keytool -genkey -v -keystore grindproof-release.keystore \
  -alias grindproof -keyalg RSA -keysize 2048 -validity 10000
```
- [ ] Keystore generated
- [ ] Save in secure location (NOT in project!)
- [ ] Remember password!

### Add Signing Config
Create `android/keystore.properties`:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=grindproof
storeFile=/path/to/grindproof-release.keystore
```
- [ ] File created
- [ ] Verify in .gitignore (keep private!)

In `android/app/build.gradle`, add:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ... other settings
        }
    }
}
```
- [ ] Signing configured (skip for now if testing only)

## Step 8: Sync and Build

### Sync Project
In Android Studio:
1. [ ] File → Sync Project with Gradle Files
2. [ ] Wait for sync to complete
3. [ ] Check "Build" tab for any errors

### Build APK
```bash
# Debug build
cd android
./gradlew assembleDebug
```
- [ ] Build completed successfully
- [ ] APK created at `android/app/build/outputs/apk/debug/app-debug.apk`

## Step 9: Run on Device/Emulator

### Option A: Use Android Studio
1. [ ] Connect Android device via USB (enable USB debugging)
   - OR: Create/start emulator (Tools → Device Manager)
2. [ ] Select device from dropdown
3. [ ] Click Run button (▶️)
4. [ ] App launches successfully

### Option B: Use Command Line
```bash
yarn cap:run:android
```
- [ ] App launches on connected device/emulator

## Step 10: Test Push Notifications

### Grant Notification Permission
1. [ ] Launch app
2. [ ] Allow notification permission when prompted
3. [ ] Check Logcat for: "Push registration success, token: ..."

### Copy Device Token
In Android Studio:
1. [ ] Open Logcat (View → Tool Windows → Logcat)
2. [ ] Filter by "Push"
3. [ ] Copy the FCM token (long string)

### Send Test Notification

**Option 1: Firebase Console**
1. [ ] Go to Firebase Console → Cloud Messaging
2. [ ] Click "Send test message"
3. [ ] Paste device token
4. [ ] Enter notification title and body
5. [ ] Click "Test"
6. [ ] Notification appears on device

**Option 2: Test Script**
```bash
node scripts/send-test-notification.js YOUR_DEVICE_TOKEN
```
- [ ] Notification received

### Verify Database
1. [ ] Open Supabase dashboard
2. [ ] Go to Table Editor → device_tokens
3. [ ] Verify token exists with platform: 'android'

## Step 11: Test Background Notifications

### Test While App is Closed
1. [ ] Close app completely (swipe away from recent apps)
2. [ ] Send test notification
3. [ ] Notification appears in notification tray
4. [ ] Tap notification
5. [ ] App launches to correct screen

- [ ] Background notifications working

### Test While App is Open
1. [ ] Keep app open
2. [ ] Send test notification
3. [ ] Check console logs
4. [ ] Notification received in foreground

- [ ] Foreground notifications working

## Step 12: Release Build (Optional)

### Build Release APK
```bash
cd android
./gradlew assembleRelease
```
- [ ] Release APK created
- [ ] Located at `android/app/build/outputs/apk/release/app-release.apk`

### Build App Bundle (for Play Store)
```bash
cd android
./gradlew bundleRelease
```
- [ ] App Bundle (.aab) created
- [ ] Located at `android/app/build/outputs/bundle/release/app-release.aab`

### Test Release Build
```bash
# Install release APK
adb install android/app/build/outputs/apk/release/app-release.apk
```
- [ ] Release build installs and runs correctly

## Step 13: Play Store Preparation (Optional)

### Create Play Console Account
1. [ ] Go to https://play.google.com/console
2. [ ] Pay $25 one-time registration fee
3. [ ] Complete account setup

### Create New App
1. [ ] Click "Create app"
2. [ ] App name: `Grindproof`
3. [ ] Default language: English
4. [ ] App type: App
5. [ ] Free or Paid: Free

### Fill Out Store Listing
- [ ] App name
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Screenshots (at least 2)
- [ ] Feature graphic (1024x500)
- [ ] App icon (512x512)
- [ ] Privacy policy URL
- [ ] Category: Productivity

### Upload App Bundle
1. [ ] Go to Production → Create new release
2. [ ] Upload app-release.aab
3. [ ] Fill out release notes
4. [ ] Submit for review

## Troubleshooting

### "google-services.json not found"
- Verify file is at exactly: `android/app/google-services.json`
- File → Sync Project with Gradle Files
- Rebuild project

### "Failed to resolve: com.google.firebase"
- Check internet connection
- Update Google Repository in SDK Manager
- Sync and rebuild

### Gradle sync failed
```bash
cd android
./gradlew clean
./gradlew build --refresh-dependencies
```

### Push notifications not working
- Verify `google-services.json` is correct
- Check Firebase project matches package name exactly
- Test on physical device (emulator may have issues)
- Check Logcat for FCM registration errors

### "Installation failed with INSTALL_FAILED_UPDATE_INCOMPATIBLE"
- Uninstall old version of app first
- Or change package name

### APK not installing
- Enable "Install from unknown sources" in device settings
- Check minimum SDK version compatibility

## Complete! 🎉

- [ ] All items checked off
- [ ] App builds successfully
- [ ] Runs on device/emulator
- [ ] Push notifications work
- [ ] Ready for testing

Your Android app is ready!

## Next Steps
- [ ] Test on multiple Android versions (9+)
- [ ] Optimize APK size
- [ ] Add app analytics
- [ ] Implement deep linking
- [ ] Add app shortcuts (optional)
- [ ] Prepare for Play Store release

---

**Need help?** Check the [main setup guide](./MOBILE_APP_SETUP.md) or refer to [Capacitor Android docs](https://capacitorjs.com/docs/android).

