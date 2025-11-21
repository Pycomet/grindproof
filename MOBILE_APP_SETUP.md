# Mobile App Setup Guide

This guide walks you through setting up the Grindproof mobile app for iOS and Android with push notifications.

## Prerequisites

- **Node.js & Yarn** installed
- **Xcode** (Mac only, for iOS development)
- **Android Studio** (for Android development)
- **Apple Developer Account** ($99/year, for iOS push notifications)
- **Google Firebase Account** (free, for Android push notifications)

## Step 1: Install Dependencies

First, install the new packages:

```bash
yarn install
```

This will install:
- `@capacitor/push-notifications` - Push notification support
- `@capacitor/splash-screen` - Native splash screen

## Step 2: Initialize Native Platforms

Add iOS and Android platforms to your project:

```bash
# Add iOS platform (Mac only)
npx cap add ios

# Add Android platform
npx cap add android
```

This creates `ios/` and `android/` folders with native projects.

## Step 3: Build and Sync

Build your Next.js app and sync to native platforms:

```bash
# Build the Next.js app (it will load remotely from https://grindproof.co)
yarn build

# Sync web assets to native platforms
yarn cap:sync
```

## Step 4: Configure iOS

### 4.1 Open in Xcode

```bash
yarn cap:open:ios
```

### 4.2 Configure Signing

1. In Xcode, select the project in the left sidebar
2. Select the "Grindproof" target
3. Go to "Signing & Capabilities" tab
4. Check "Automatically manage signing"
5. Select your Team (Apple Developer account)

### 4.3 Add Push Notification Capability

1. In "Signing & Capabilities" tab, click "+ Capability"
2. Add "Push Notifications"
3. Add "Background Modes" and check:
   - Remote notifications
   - Background fetch

### 4.4 Update Info.plist (Optional)

If you need camera/location permissions later, add to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of your completed tasks</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location services for tracking your activities</string>
```

### 4.5 Create APNs Key

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Go to "Keys" and create a new key
4. Enable "Apple Push Notifications service (APNs)"
5. Download the `.p8` key file
6. Note the Key ID and Team ID (you'll need these for Firebase)

## Step 5: Configure Android & Firebase

### 5.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "Grindproof" and follow setup steps
4. Once created, click on "Add app" and select Android

### 5.2 Register Android App

1. **Android package name**: `com.grindproof.app` (must match `appId` in capacitor.config.ts)
2. Download `google-services.json`
3. Move it to: `android/app/google-services.json`

### 5.3 Add iOS App to Firebase

1. In Firebase Console, add iOS app
2. **iOS bundle ID**: `com.grindproof.app`
3. Upload your APNs `.p8` key:
   - Go to Project Settings > Cloud Messaging > Apple app configuration
   - Upload the APNs key you created
   - Enter Key ID and Team ID
4. Download `GoogleService-Info.plist`
5. Move it to: `ios/App/App/GoogleService-Info.plist`
6. In Xcode, add this file to the project (right-click on App folder > Add Files)

### 5.4 Open Android Studio

```bash
yarn cap:open:android
```

### 5.5 Configure Android Manifest

The Android manifest should already be configured by Capacitor, but verify:

`android/app/src/main/AndroidManifest.xml` should have:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 5.6 Update build.gradle

Ensure Firebase is configured in `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'
```

And in `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

## Step 6: Run the App

### iOS

```bash
# Run on simulator
yarn cap:run:ios

# Or open Xcode and click Run
yarn cap:open:ios
```

### Android

```bash
# Run on emulator/device
yarn cap:run:android

# Or open Android Studio and click Run
yarn cap:open:android
```

## Step 7: Apply Database Migration

Run the device tokens migration on your Supabase database:

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to SQL Editor
4. Copy the contents of `supabase/migrations/20250121_add_device_tokens_table.sql`
5. Run the migration

Or use Supabase CLI:

```bash
supabase db push
```

## Testing Push Notifications

### Send a Test Notification

You can send test notifications from:

1. **Firebase Console**: Cloud Messaging > Send test message
2. **Custom backend**: Use your device token from the `device_tokens` table

Example test notification payload:

```json
{
  "notification": {
    "title": "Task Reminder",
    "body": "Don't forget to complete your workout!"
  },
  "data": {
    "route": "/dashboard",
    "taskId": "123"
  },
  "token": "YOUR_DEVICE_TOKEN_HERE"
}
```

### Verify Registration

1. Launch the app on device/simulator
2. Check browser console/Xcode console for: "Push registration success, token: ..."
3. Verify token appears in `device_tokens` table in Supabase

## Development Workflow

### For Web Development

```bash
yarn dev
```

App runs locally at `http://localhost:3000`

### For Mobile Development

```bash
# After making web changes
yarn build

# Sync to native platforms
yarn cap:sync

# Re-run the app
yarn cap:run:ios    # or
yarn cap:run:android
```

### Live Reload (Development)

For faster development, you can enable live reload:

1. Start dev server: `yarn dev`
2. Find your local IP (e.g., `192.168.1.100`)
3. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.100:3000',
     cleartext: true,
   }
   ```
4. Run `yarn cap:sync`
5. Launch app - it will load from your local dev server

**Remember to change back to production URL before releasing!**

## Troubleshooting

### iOS Issues

**"Could not connect to development server"**
- Check that your device/simulator is on same network
- Verify the URL in capacitor.config.ts
- Ensure dev server is running

**Push notifications not working**
- Verify APNs key is uploaded to Firebase
- Check that "Push Notifications" capability is added in Xcode
- Test on physical device (not simulator for production notifications)

### Android Issues

**"google-services.json not found"**
- Ensure file is at `android/app/google-services.json`
- Run `yarn cap:sync` again

**Push notifications not working**
- Verify `google-services.json` is correct
- Check Firebase project settings
- Enable "Cloud Messaging API" in Google Cloud Console

### General Issues

**"Module not found: @capacitor/push-notifications"**
- Run `yarn install` again
- Clear node_modules: `rm -rf node_modules && yarn install`

**App loads blank screen**
- Check console for errors
- Verify network connection
- Check that the remote URL is correct and accessible

## Deployment

### iOS App Store

1. Archive the app in Xcode (Product > Archive)
2. Distribute to App Store Connect
3. Fill out app metadata
4. Submit for review

### Google Play Store

1. Generate signed APK/Bundle in Android Studio
2. Upload to Google Play Console
3. Fill out store listing
4. Submit for review

## Next Steps

- [ ] Add app icons and splash screens
- [ ] Implement scheduled local notifications for task reminders
- [ ] Add deep linking for OAuth redirects
- [ ] Implement biometric authentication
- [ ] Add native camera integration for task proof photos
- [ ] Configure app rate limiting and analytics

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [iOS Push Notifications](https://developer.apple.com/documentation/usernotifications)

