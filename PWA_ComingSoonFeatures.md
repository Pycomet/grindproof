# Grindproof PWA Guide

## Optional Components

### Add Offline Status Banner

```tsx
// In your dashboard or any page
import { useOfflineBanner } from '@/hooks/useOnlineStatus';

export default function Dashboard() {
  const OfflineBanner = useOfflineBanner();
  
  return (
    <div>
      {OfflineBanner}
      {/* Your dashboard content */}
    </div>
  );
}
```

### Add Install Button in Settings

```tsx
import { InstallButton } from '@/components/InstallPWA';

export default function Settings() {
  return (
    <div>
      <h2>App Settings</h2>
      <InstallButton />
    </div>
  );
}
```

### Check Online Status in Components

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function MyComponent() {
  const isOnline = useOnlineStatus();
  
  if (!isOnline) {
    return <div>You're offline. Some features are limited.</div>;
  }
  
  return <div>Your content</div>;
}
```

## 📦 Building and Testing

### Development Mode
```bash
yarn dev
```
**Note:** Service worker is disabled in development mode to avoid caching issues.

### Production Build
```bash
yarn build
yarn start
```

### Testing PWA Features
1. Build for production: `yarn build`
2. Start production server: `yarn start`
3. Open in browser: http://localhost:3000
4. Open DevTools → Application → Service Workers
5. Verify service worker is registered
6. Test offline by checking "Offline" in Network tab

### Lighthouse PWA Audit
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App" category
4. Click "Analyze page load"
5. Should score 100 with all PWA criteria met

## 🔧 Advanced Features

### Background Sync

Background Sync allows your app to defer actions until the user has stable connectivity. Perfect for Grindproof's goal/routine updates when offline.

#### What is Background Sync?

When a user completes a goal or updates a routine while offline:
1. Action is queued in IndexedDB
2. Service worker waits for connectivity
3. Automatically syncs when online
4. User gets confirmation of sync

#### Implementation Steps

**1. Install Workbox Background Sync**

Already included in `next-pwa`, but you'll need to configure it:

```typescript
// next.config.ts - Add to runtimeCaching array
{
  urlPattern: /\/api\/trpc\/.*/i,
  handler: 'NetworkOnly',
  options: {
    backgroundSync: {
      name: 'apiQueue',
      options: {
        maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
      },
    },
  },
}
```

**2. Create Background Sync Manager**

```typescript
// src/lib/backgroundSync.ts
export class BackgroundSyncManager {
  private dbName = 'grindproof-sync';
  private storeName = 'pending-actions';
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async addAction(action: any) {
    if (!this.db) await this.init();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add({
        ...action,
        timestamp: Date.now(),
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions() {
    if (!this.db) await this.init();
    
    return new Promise<any[]>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeAction(id: number) {
    if (!this.db) await this.init();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

**3. Use Background Sync in Components**

```typescript
// src/hooks/useBackgroundSync.ts
import { useState, useEffect } from 'react';
import { BackgroundSyncManager } from '@/lib/backgroundSync';

export function useBackgroundSync() {
  const [syncManager] = useState(() => new BackgroundSyncManager());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePendingCount = async () => {
      const actions = await syncManager.getPendingActions();
      setPendingCount(actions.length);
    };

    updatePendingCount();
    
    // Update count when coming back online
    window.addEventListener('online', updatePendingCount);
    return () => window.removeEventListener('online', updatePendingCount);
  }, [syncManager]);

  const queueAction = async (action: any) => {
    await syncManager.addAction(action);
    setPendingCount(prev => prev + 1);
  };

  return { queueAction, pendingCount };
}
```

**4. Integrate with Your API Calls**

```typescript
// In your goal/routine update functions
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function useGoalUpdate() {
  const isOnline = useOnlineStatus();
  const { queueAction } = useBackgroundSync();
  const updateGoalMutation = trpc.goal.update.useMutation();

  const updateGoal = async (goalId: string, data: any) => {
    if (isOnline) {
      // Normal online flow
      return updateGoalMutation.mutate({ id: goalId, ...data });
    } else {
      // Queue for background sync
      await queueAction({
        type: 'UPDATE_GOAL',
        goalId,
        data,
      });
      
      // Optimistically update UI
      // Show "Pending sync" indicator
    }
  };

  return { updateGoal };
}
```

**5. Show Sync Status to Users**

```tsx
// src/components/SyncStatusBanner.tsx
'use client';

import { useBackgroundSync } from '@/hooks/useBackgroundSync';

export function SyncStatusBanner() {
  const { pendingCount } = useBackgroundSync();

  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 rounded-lg bg-orange-500 px-4 py-2 text-sm text-white shadow-lg">
      {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} pending sync
    </div>
  );
}
```

#### Testing Background Sync

1. Go offline (DevTools → Network → Offline)
2. Make changes (update goal, complete routine)
3. Verify action is queued
4. Go back online
5. Verify sync occurs automatically

### Push Notifications

Push notifications are perfect for Grindproof's accountability features:
- 9am: "Time to plan your day"
- 6pm: "Reality check - what did you actually do?"
- Sunday: "Weekly roast incoming"

#### Prerequisites

1. **HTTPS Required** - Push notifications only work over HTTPS (Vercel handles this)
2. **User Permission** - Must request notification permission
3. **Backend Support** - Requires server to send push messages
4. **Push Service** - Use a service like Firebase Cloud Messaging (FCM) or Web Push

#### Implementation Steps

**1. Request Notification Permission**

```typescript
// src/hooks/useNotifications.ts
'use client';

import { useState, useEffect } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Your VAPID public key (generate with web-push library)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(subscription);
      
      // Send subscription to your backend
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    }
  };

  const unsubscribeFromPush = async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
      
      // Notify backend
      await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
    }
  };

  return {
    permission,
    subscription,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  };
}

// Helper function
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

**2. Create Notification Settings Component**

```tsx
// src/components/NotificationSettings.tsx
'use client';

import { useNotifications } from '@/hooks/useNotifications';

export function NotificationSettings() {
  const {
    permission,
    subscription,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  } = useNotifications();

  const handleEnableNotifications = async () => {
    try {
      const perm = await requestPermission();
      if (perm === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="mb-2 text-lg font-semibold">Push Notifications</h3>
      
      {permission === 'default' && (
        <div>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Enable notifications to get reminders for your daily check-ins and weekly reviews.
          </p>
          <button
            onClick={handleEnableNotifications}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Enable Notifications
          </button>
        </div>
      )}
      
      {permission === 'granted' && subscription && (
        <div>
          <p className="mb-4 text-sm text-green-600 dark:text-green-400">
            ✓ Notifications enabled
          </p>
          <button
            onClick={unsubscribeFromPush}
            className="rounded-full border-2 border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-900 dark:border-zinc-700 dark:text-zinc-300"
          >
            Disable Notifications
          </button>
        </div>
      )}
      
      {permission === 'denied' && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}
    </div>
  );
}
```

**3. Backend: Generate VAPID Keys**

```bash
# Install web-push library
yarn add web-push

# Generate VAPID keys (run once)
npx web-push generate-vapid-keys
```

Add to `.env.local`:
```
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
```

**4. Backend: Store Subscriptions**

```typescript
// Add to your Supabase schema or database
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**5. Backend: API Routes**

```typescript
// src/app/api/subscribe/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const subscription = await request.json();
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Store subscription in database
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      subscription: subscription,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

```typescript
// src/app/api/send-notification/route.ts
import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';

webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const { userId, title, body, url } = await request.json();
  const supabase = await createClient();

  // Get user's subscription
  const { data: sub } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .single();

  if (!sub) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url,
  });

  try {
    await webpush.sendNotification(sub.subscription, payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
```

**6. Service Worker: Handle Push Events**

Create `public/sw-custom.js`:

```javascript
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-72x72.png',
        data: {
          url: data.url || '/',
        },
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

**7. Schedule Notifications**

Use a cron job or scheduled function (e.g., Vercel Cron Jobs):

```typescript
// src/app/api/cron/daily-reminder/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  
  // Get all active users
  const { data: users } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription');

  // Send notifications to all users
  const hour = new Date().getHours();
  let title, body, url;
  
  if (hour === 9) {
    title = '🌅 Time to Plan Your Day';
    body = "What are you going to accomplish today? Let's set some goals.";
    url = '/dashboard';
  } else if (hour === 18) {
    title = '⏰ Reality Check Time';
    body = "How did you do today? Time to face the truth.";
    url = '/dashboard';
  }

  if (title && body) {
    for (const user of users || []) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.user_id,
          title,
          body,
          url,
        }),
      });
    }
  }

  return NextResponse.json({ success: true, count: users?.length || 0 });
}
```

**8. Configure Vercel Cron Jobs**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-reminder",
      "schedule": "0 9,18 * * *"
    }
  ]
}
```

#### Testing Push Notifications

1. **Local Testing:**
   - Use ngrok to expose localhost over HTTPS
   - Test subscription flow
   - Manually trigger notification via API

2. **Production Testing:**
   - Deploy to Vercel
   - Enable notifications in app
   - Test cron jobs
   - Verify notifications arrive

#### Notification Best Practices

1. **Ask at the right time** - Don't ask immediately on page load
2. **Explain the value** - Tell users why notifications are useful
3. **Allow easy opt-out** - Make it simple to disable
4. **Respect frequency** - Don't spam users
5. **Make them actionable** - Include relevant links

## 📱 Mobile Installation Instructions

### iOS (Safari)
1. Open your deployed site in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Customize name if desired
5. Tap "Add"

### Android (Chrome)
1. Open your deployed site in Chrome
2. Tap the three-dot menu
3. Tap "Install app" or "Add to Home Screen"
4. Confirm installation
5. App appears on home screen

### Desktop (Chrome/Edge)
1. Open your deployed site
2. Look for install icon in address bar (⊕)
3. Click install button
4. App opens in standalone window

## 🔍 Troubleshooting

### Service Worker Not Registering
- Check DevTools → Application → Service Workers
- Ensure you're on HTTPS (or localhost)
- Clear cache and hard reload (Cmd/Ctrl + Shift + R)
- Check console for errors

### Icons Not Showing
- Verify files exist in `/public/icons/`
- Check manifest.json syntax
- Hard reload page
- Check image sizes match manifest

### Offline Mode Not Working
- Build for production (`yarn build`)
- Service worker disabled in development
- Check Network tab → Offline checkbox
- Verify cache strategies in next.config.ts

### Install Prompt Not Appearing
- Already installed (check display mode)
- Dismissed recently (clears on browser restart)
- Missing manifest or icons
- Not on HTTPS

### Push Notifications Not Working
- Check browser permissions
- Verify VAPID keys are correct
- Ensure HTTPS (required for push)
- Check service worker registration
- Verify subscription stored in database

## 📚 Resources

- [Next PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Web Push Protocol](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

