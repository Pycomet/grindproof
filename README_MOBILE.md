# Grindproof Mobile App

Native iOS and Android app built with Capacitor, loading from https://grindproof.co with full push notification support.

## 🚀 Quick Start

**Get running in 5 minutes:**

```bash
# Install dependencies
yarn install

# Add platforms
npx cap add ios       # Mac only
npx cap add android

# Open and run
yarn cap:open:ios     # Or: yarn cap:open:android
```

**[Read the Quick Start Guide →](./QUICK_START_MOBILE.md)**

## 📱 Architecture

### Hybrid Remote Loading
- Web app hosted at https://grindproof.co
- Native shell with Capacitor plugins
- Full offline support via service workers
- Push notifications via FCM (Android) and APNs (iOS)

### Benefits
- ✅ No need to rebuild native apps for web changes
- ✅ Instant updates (no app store review for web updates)
- ✅ Native features via Capacitor plugins
- ✅ Same codebase as web app
- ✅ OAuth works seamlessly in WebView

## 📚 Documentation

### Setup Guides
- **[Quick Start](./QUICK_START_MOBILE.md)** - Get running in minutes
- **[Full Setup Guide](./MOBILE_APP_SETUP.md)** - Complete walkthrough
- **[iOS Checklist](./IOS_SETUP_CHECKLIST.md)** - Step-by-step iOS setup
- **[Android Checklist](./ANDROID_SETUP_CHECKLIST.md)** - Step-by-step Android setup

### Features Implemented
- ✅ Native app shells (iOS & Android)
- ✅ Push notification infrastructure
- ✅ Device token registration
- ✅ Notification routing
- ✅ Background/foreground notification handling
- ✅ Permission management
- ✅ Remote loading from production

### Next Features
- ⏳ Deep linking for OAuth redirects
- ⏳ Local notifications for task reminders
- ⏳ Native camera integration
- ⏳ Biometric authentication
- ⏳ App shortcuts

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Yarn
- Xcode (Mac, for iOS)
- Android Studio (for Android)
- Apple Developer account (for iOS push notifications)
- Firebase account (free)

### Key Commands

```bash
# Development
yarn dev                    # Run web dev server
yarn build                  # Build web app
yarn cap:sync              # Sync web → native

# Mobile
yarn cap:open:ios          # Open Xcode
yarn cap:open:android      # Open Android Studio
yarn cap:run:ios           # Build & run on iOS
yarn cap:run:android       # Build & run on Android

# Testing
yarn test                   # Run tests
node scripts/send-test-notification.js <token>  # Test push
```

### Project Structure

```
grindproof/
├── src/                              # Next.js web app
│   ├── app/                         # App pages & API routes
│   │   └── api/notifications/       # Push notification endpoints
│   ├── hooks/
│   │   └── useNotifications.tsx    # Notification hook
│   ├── lib/notifications/
│   │   └── handler.ts              # Push notification handler
│   └── contexts/
│       └── AppContext.tsx          # Includes notification integration
├── ios/                             # iOS native project (created by cap add ios)
│   └── App/
│       └── App/
│           ├── GoogleService-Info.plist  # Firebase config
│           └── Info.plist               # iOS configuration
├── android/                         # Android native project (created by cap add android)
│   └── app/
│       ├── google-services.json    # Firebase config
│       └── src/main/AndroidManifest.xml
├── capacitor.config.ts             # Capacitor configuration
├── supabase/migrations/
│   └── 20250121_add_device_tokens_table.sql
└── scripts/
    └── send-test-notification.js   # Test notification script
```

## 🔔 Push Notifications

### How It Works

1. **Registration**: App requests permission on launch (mobile only)
2. **Token Generation**: FCM/APNs generates device token
3. **Backend Registration**: Token sent to `/api/notifications/register`
4. **Storage**: Token stored in Supabase `device_tokens` table
5. **Sending**: Backend sends notifications via Firebase Admin SDK

### Database Schema

```sql
device_tokens
├── id (uuid)
├── user_id (uuid) → auth.users
├── token (text) - FCM/APNs token
├── platform (text) - ios | android
├── created_at
└── last_used
```

### Testing Notifications

**Quick test via Firebase:**
1. Get device token from app logs
2. Firebase Console → Cloud Messaging → Send test message
3. Paste token and send

**Via test script:**
```bash
# Setup (one time)
npm install firebase-admin
# Download firebase-admin-key.json from Firebase Console

# Send test
node scripts/send-test-notification.js <device-token>
```

## 🔐 Security

### What's Gitignored
- `google-services.json` (Android Firebase config)
- `GoogleService-Info.plist` (iOS Firebase config)
- `firebase-admin-key.json` (Server-side key)
- Native build artifacts
- Keystore files

### Environment Variables
```bash
# Already configured in your .env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 🚢 Deployment

### Development Mode
```typescript
// capacitor.config.ts
server: {
  url: 'http://YOUR_LOCAL_IP:3000',
  cleartext: true,
}
```

### Production Mode
```typescript
// capacitor.config.ts
server: {
  url: 'https://grindproof.co',
}
```

### Release Process

**iOS:**
1. Archive in Xcode
2. Upload to App Store Connect
3. Submit for review

**Android:**
1. `cd android && ./gradlew bundleRelease`
2. Upload `.aab` to Play Console
3. Submit for review

## 🐛 Troubleshooting

### Common Issues

**"Cannot find module @capacitor/push-notifications"**
```bash
yarn install
```

**iOS: Blank screen on launch**
- Check network connectivity
- Verify URL in capacitor.config.ts
- Check Xcode console for errors

**Android: google-services.json not found**
- Place file at `android/app/google-services.json`
- Sync project in Android Studio

**Push notifications not working**
- iOS: Test on physical device (not simulator)
- Verify Firebase setup is complete
- Check device token in Supabase
- Ensure APNs key uploaded (iOS) or FCM configured (Android)

**See full troubleshooting guides:**
- [iOS Troubleshooting](./IOS_SETUP_CHECKLIST.md#troubleshooting)
- [Android Troubleshooting](./ANDROID_SETUP_CHECKLIST.md#troubleshooting)
- [General Troubleshooting](./MOBILE_APP_SETUP.md#troubleshooting)

## 📝 Configuration Files

### capacitor.config.ts
Main Capacitor configuration - defines app ID, name, web directory, server URL, and plugin settings.

### Firebase Configuration
- **iOS**: `ios/App/App/GoogleService-Info.plist`
- **Android**: `android/app/google-services.json`
- Templates provided: `*.template` files

### Native Configurations
- **iOS**: `ios/App/App/Info.plist` - Permissions and settings
- **Android**: `android/app/src/main/AndroidManifest.xml` - Permissions and components

## 🤝 Contributing

When adding mobile features:
1. Add plugin to `package.json`
2. Update `capacitor.config.ts` if needed
3. Document in relevant checklist
4. Test on both iOS and Android
5. Update this README

## 📞 Support

- 📖 [Capacitor Docs](https://capacitorjs.com/docs)
- 🔔 [Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- 🔥 [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- 📱 [iOS Push Notifications](https://developer.apple.com/documentation/usernotifications)

## 📄 License

Same as main project.

---

**Ready to build?** Start with the [Quick Start Guide](./QUICK_START_MOBILE.md)!

