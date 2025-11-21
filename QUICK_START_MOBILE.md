# Quick Start - Mobile App

Get the Grindproof mobile app running in under 10 minutes! 🚀

## TL;DR - Just Get It Running

```bash
# 1. Install dependencies
yarn install

# 2. Add platforms (Mac for iOS, anyone for Android)
npx cap add ios       # Mac only
npx cap add android   # All platforms

# 3. Open in native IDE
yarn cap:open:ios     # Opens Xcode
yarn cap:open:android # Opens Android Studio

# 4. Click Run! ▶️
```

The app will load from https://grindproof.co (remote loading mode).

## Wait, I Want Push Notifications

### Quick Firebase Setup (5 minutes)

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/
   - Click "Add project" → name it "Grindproof"
   
2. **Add Android App**
   - Click "Add app" → Android
   - Package name: `com.grindproof.app`
   - Download `google-services.json` → save to `android/app/`
   
3. **Add iOS App**
   - Click "Add app" → iOS  
   - Bundle ID: `com.grindproof.app`
   - Download `GoogleService-Info.plist` → save to `ios/App/App/`
   - In Xcode: Right-click on App folder → Add Files → select the .plist

4. **Get APNs Key** (iOS only)
   - Go to https://developer.apple.com/account/resources/authkeys/list
   - Create new key → Enable "APNs"
   - Download `.p8` file
   - In Firebase Console → Project Settings → Cloud Messaging → Upload APNs key

5. **Sync & Run**
   ```bash
   yarn cap:sync
   yarn cap:open:ios     # or yarn cap:open:android
   ```

### Database Setup

Run this SQL in your Supabase dashboard:

```sql
-- Copy from: supabase/migrations/20250121_add_device_tokens_table.sql
```

Done! Notifications should work now. 🎉

## Testing Notifications

### Method 1: Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send test message"
3. Add your device token (check app console logs)
4. Send!

### Method 2: Test Script
```bash
# Install Firebase Admin SDK
npm install firebase-admin

# Download service account key from Firebase
# Save as firebase-admin-key.json

# Run test script
node scripts/send-test-notification.js YOUR_DEVICE_TOKEN
```

## Common Issues

**"Cannot find module @capacitor/push-notifications"**
```bash
yarn install
```

**iOS: "Signing requires a development team"**
- In Xcode → Select project → Signing & Capabilities
- Check "Automatically manage signing"
- Select your Apple Developer team

**Android: "google-services.json not found"**
- Download from Firebase Console
- Place at `android/app/google-services.json`
- Restart Android Studio

**Blank screen on launch**
- Check that https://grindproof.co is accessible
- Check network in device/simulator
- Look at console logs for errors

## Development Tips

### Local Development Mode

Want to test local changes without building each time?

1. Start dev server: `yarn dev`
2. Get your computer's local IP: `ifconfig` (look for 192.168.x.x)
3. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.100:3000',  // Your local IP
     cleartext: true,
   }
   ```
4. Run: `yarn cap:sync && yarn cap:run:ios`

App now loads from your dev server! Changes reflect immediately.

**⚠️ Change back to production URL before releasing!**

### Useful Commands

```bash
# Sync web → native (after changes)
yarn cap:sync

# Open native IDEs
yarn cap:open:ios
yarn cap:open:android

# Run on device/simulator
yarn cap:run:ios
yarn cap:run:android

# Clean rebuild
rm -rf ios/App/Pods android/.gradle
yarn cap:sync
```

## Next Steps

- [ ] Test notifications on physical device
- [ ] Customize app icons & splash screen
- [ ] Set up CI/CD for mobile builds
- [ ] Submit to App Store / Play Store

Need more details? See [MOBILE_APP_SETUP.md](./MOBILE_APP_SETUP.md)

---

**Questions?** Check the [troubleshooting section](./MOBILE_APP_SETUP.md#troubleshooting) or open an issue!

