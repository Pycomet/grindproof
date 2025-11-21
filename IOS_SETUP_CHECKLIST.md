# iOS Setup Checklist

Complete guide for iOS app configuration. Check off each item as you go!

## Prerequisites
- [ ] Mac with macOS 12.0 or later
- [ ] Xcode 14.0 or later installed
- [ ] Apple Developer account ($99/year)
- [ ] Node.js and Yarn installed

## Step 1: Initialize iOS Platform
```bash
npx cap add ios
```
- [ ] Command completed successfully
- [ ] `ios/` folder created

## Step 2: Open in Xcode
```bash
yarn cap:open:ios
```
- [ ] Xcode opened with project
- [ ] No immediate errors in Xcode

## Step 3: Configure Project Settings

### Basic Configuration
- [ ] Select project in left sidebar
- [ ] Select "App" target
- [ ] General tab → Display Name: `Grindproof`
- [ ] General tab → Bundle Identifier: `com.grindproof.app`
- [ ] Deployment Info → Minimum Deployment: iOS 13.0+

### Signing & Capabilities
- [ ] Go to "Signing & Capabilities" tab
- [ ] Check "Automatically manage signing"
- [ ] Select Team (your Apple Developer account)
- [ ] Verify provisioning profile generated

## Step 4: Add Push Notification Capability
- [ ] Click "+ Capability" button
- [ ] Search and add "Push Notifications"
- [ ] Verify it appears in capability list

## Step 5: Add Background Modes
- [ ] Click "+ Capability" button
- [ ] Search and add "Background Modes"
- [ ] Check these boxes:
  - [ ] Remote notifications
  - [ ] Background fetch

## Step 6: Configure Info.plist

Open `ios/App/App/Info.plist` in Xcode:

### Required Permissions
Already configured by Capacitor ✓

### Optional Permissions (add if needed later)

**For camera access (task photos):**
```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of your completed tasks as proof</string>
```

**For photo library:**
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Select photos to attach to your tasks</string>
```

**For location services:**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Track your location for activity logging</string>
```

- [ ] Info.plist configured (if needed)

## Step 7: Firebase Configuration

### Create APNs Authentication Key
1. [ ] Go to https://developer.apple.com/account/resources/authkeys/list
2. [ ] Click "+" to create new key
3. [ ] Name it "Grindproof Push Notifications"
4. [ ] Check "Apple Push Notifications service (APNs)"
5. [ ] Click "Continue" → "Register"
6. [ ] Download the `.p8` key file
7. [ ] Note the Key ID (e.g., `ABC123DEFG`)
8. [ ] Note your Team ID (in Account settings)

**⚠️ Important:** The `.p8` key can only be downloaded once! Save it securely.

### Add iOS App to Firebase
1. [ ] Go to Firebase Console → Your project
2. [ ] Click "Add app" → iOS
3. [ ] Bundle ID: `com.grindproof.app`
4. [ ] App nickname: `Grindproof iOS`
5. [ ] Click "Register app"
6. [ ] Download `GoogleService-Info.plist`

### Add GoogleService-Info.plist to Xcode
1. [ ] Open Xcode
2. [ ] Right-click on "App" folder in left sidebar
3. [ ] Select "Add Files to App..."
4. [ ] Navigate to downloaded `GoogleService-Info.plist`
5. [ ] **Important:** Check "Copy items if needed"
6. [ ] **Important:** Check "Add to targets: App"
7. [ ] Click "Add"
8. [ ] Verify file appears under App folder in Xcode

### Upload APNs Key to Firebase
1. [ ] Go to Firebase Console → Project Settings
2. [ ] Click "Cloud Messaging" tab
3. [ ] Scroll to "Apple app configuration"
4. [ ] Click "Upload" under APNs Authentication Key
5. [ ] Select your `.p8` file
6. [ ] Enter Key ID (from step 7 above)
7. [ ] Enter Team ID
8. [ ] Click "Upload"

## Step 8: Build Configuration

### Verify Build Settings
- [ ] Select project → "App" target
- [ ] Build Settings tab
- [ ] Search for "Swift Language Version"
- [ ] Verify it's set to Swift 5.0 or later

### Verify Schemes
- [ ] Product → Scheme → "App"
- [ ] Edit Scheme → Run → Build Configuration: Debug
- [ ] Edit Scheme → Archive → Build Configuration: Release

## Step 9: Test Build

### Build for Simulator
1. [ ] Select a simulator (e.g., iPhone 15 Pro)
2. [ ] Click Run button (▶️) or press Cmd+R
3. [ ] Wait for build to complete
4. [ ] App launches in simulator
5. [ ] No build errors

**Note:** Push notifications don't work in simulator, only on physical devices.

### Build for Physical Device (Recommended)
1. [ ] Connect iPhone/iPad via USB
2. [ ] Trust computer on device if prompted
3. [ ] Select your device in Xcode
4. [ ] Click Run button (▶️)
5. [ ] On device: Settings → General → VPN & Device Management
6. [ ] Trust your developer certificate
7. [ ] Launch app again
8. [ ] App runs successfully

## Step 10: Test Push Notifications

### Verify Registration
1. [ ] Launch app on physical device
2. [ ] Grant notification permission when prompted
3. [ ] Check Xcode console for log: "Push registration success, token: ..."
4. [ ] Copy the device token

### Send Test Notification
```bash
# Using Firebase Console
```
1. [ ] Go to Firebase Console → Cloud Messaging
2. [ ] Click "Send test message"
3. [ ] Paste device token
4. [ ] Add test notification text
5. [ ] Click "Test"
6. [ ] Notification received on device

OR

```bash
# Using test script
node scripts/send-test-notification.js YOUR_DEVICE_TOKEN
```
- [ ] Notification received successfully

### Verify Database Registration
1. [ ] Open Supabase dashboard
2. [ ] Go to Table Editor → device_tokens
3. [ ] Verify your token appears with platform: 'ios'

## Step 11: App Store Preparation (Optional)

### Add App Icons
1. [ ] Open `ios/App/App/Assets.xcassets/AppIcon.appiconset`
2. [ ] Add all required icon sizes
3. [ ] Recommended: Use online generator like appicon.co

### Add Launch Screen
1. [ ] Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard`
2. [ ] Or use Splash Screen plugin

### App Store Connect
1. [ ] Go to https://appstoreconnect.apple.com/
2. [ ] Click "My Apps" → "+"
3. [ ] Create new app
4. [ ] Fill in metadata
5. [ ] Upload screenshots
6. [ ] Submit for review

## Troubleshooting

### "Signing for App requires a development team"
- You need an Apple Developer account
- Or: Xcode → Preferences → Accounts → Add Apple ID

### "Provisioning profile doesn't include signing certificate"
- Download certificates from developer.apple.com
- Or: Let Xcode manage it automatically

### "Push notifications not working"
- Verify APNs key uploaded to Firebase
- Test on physical device (not simulator)
- Check capability is added in Xcode
- Verify token appears in Supabase

### "Failed to register for remote notifications"
- Check internet connection
- Verify Firebase setup is complete
- Check Xcode console for specific error

### "GoogleService-Info.plist not found"
- Ensure file is added to Xcode project
- Verify "Copy items if needed" was checked
- Check file is in App target

## Complete! 🎉

- [ ] All items checked off
- [ ] App builds successfully
- [ ] Runs on physical device
- [ ] Push notifications work

Your iOS app is ready for testing and development!

## Next Steps
- [ ] Test on multiple iOS versions
- [ ] Add app analytics
- [ ] Implement deep linking
- [ ] Add widgets (optional)
- [ ] Prepare for App Store submission

---

**Need help?** Check the [main setup guide](./MOBILE_APP_SETUP.md) or refer to [Capacitor iOS docs](https://capacitorjs.com/docs/ios).

