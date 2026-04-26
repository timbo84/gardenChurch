# Push Notifications in React Native (iOS) — Setup Guide

## Overview

This guide covers setting up push notifications in a bare React Native app (no Expo) using **Firebase Cloud Messaging (FCM)** + **`@notifee/react-native`**. FCM handles delivery on both iOS and Android. Notifee handles display and styling on the device.

---

## Prerequisites

- Apple Developer Account ($99/year) with access to create certificates and identifiers
- Firebase account (free tier is fine)
- Xcode installed
- React Native project already building on iOS

---

## Step 1 — Firebase Project Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → name it → continue
3. Once created, click **iOS** icon to add an iOS app
4. Enter your **Bundle ID** (find it in Xcode → your target → General → Bundle Identifier, e.g. `com.yourcompany.appname`)
5. Download `GoogleService-Info.plist`
6. In Xcode, drag `GoogleService-Info.plist` into the project root (under the app target, not a subfolder) — make sure **"Copy items if needed"** is checked and your target is selected
7. **Do not add it to git** — add to `.gitignore`:
   ```
   ios/GoogleService-Info.plist
   ```

---

## Step 2 — APNs Key in Firebase

Firebase needs permission to send notifications to Apple devices via APNs.

1. Go to [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles**
2. Click **Keys** → **+** (new key)
3. Name it (e.g. "APNs Key"), check **Apple Push Notifications service (APNs)**
4. Click Continue → Register → **Download** (you only get one chance)
5. Note your **Key ID** and **Team ID** (top right of developer portal)
6. In Firebase Console → your project → **Project Settings** → **Cloud Messaging** tab
7. Under **Apple app configuration**, upload the `.p8` key file, enter Key ID and Team ID

---

## Step 3 — Enable Push Notifications Capability in Xcode

1. Open `ios/YourApp.xcworkspace` in Xcode
2. Click your app target → **Signing & Capabilities**
3. Click **+ Capability** → add **Push Notifications**
4. Also add **Background Modes** → check **Remote notifications**

This adds the entitlement to your app so iOS allows it to receive push notifications.

---

## Step 4 — Install Libraries

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
cd ios && pod install && cd ..
```

### Why two libraries?
- **`@react-native-firebase/messaging`** — receives the push from FCM, gets the device token, handles background/quit state messages
- **`@notifee/react-native`** — displays the notification on device with full control over appearance (sound, badge, channel, etc.)

---

## Step 5 — iOS Native Setup

### AppDelegate.mm

Add Firebase initialization at the top of `didFinishLaunchingWithOptions`:

```objc
#import <Firebase.h>  // add this import at top of file

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];  // add this as first line of method body
  // ... rest of existing code
}
```

### Podfile

Ensure you have the use_frameworks or modular headers if needed. Usually adding the npm packages is enough, but if you get build errors add:

```ruby
pod 'Firebase/Messaging'
```

---

## Step 6 — Request Permission & Get Token

In your app (e.g. after login), request notification permission and save the FCM token:

```typescript
import messaging from '@react-native-firebase/messaging'
import { supabase } from '../lib/supabase'

export async function registerForPushNotifications(userId: string) {
  // Request permission
  const authStatus = await messaging().requestPermission()
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL

  if (!enabled) return

  // Get FCM token
  const token = await messaging().getToken()

  // Save token to your database so you can send targeted notifications
  await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform: 'ios' }, { onConflict: 'user_id' })
}
```

Call this after a successful login.

### Supabase table for tokens

```sql
create table push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  token text not null,
  platform text default 'ios',
  created_at timestamptz default now(),
  unique(user_id)
);
```

---

## Step 7 — Display Notifications with Notifee

### Foreground notifications (app is open)

By default FCM does NOT show a notification banner when the app is in the foreground. Use Notifee to display it:

```typescript
import messaging from '@react-native-firebase/messaging'
import notifee from '@notifee/react-native'

// Call this once in your App.tsx
export function setupForegroundNotifications() {
  messaging().onMessage(async remoteMessage => {
    await notifee.displayNotification({
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      android: {
        channelId: 'default',
      },
    })
  })
}
```

### Background/quit state

FCM handles these automatically — the OS displays the notification. When the user taps it, your app opens. You can handle the tap:

```typescript
// Opened from background
messaging().onNotificationOpenedApp(remoteMessage => {
  console.log('Opened from background:', remoteMessage)
  // navigate to relevant screen
})

// Opened from quit state
messaging().getInitialNotification().then(remoteMessage => {
  if (remoteMessage) {
    console.log('Opened from quit:', remoteMessage)
    // navigate to relevant screen
  }
})
```

---

## Step 8 — Sending Notifications

### Option A — Firebase Console (manual, for testing)

1. Firebase Console → **Engage** → **Messaging**
2. Click **Send your first message**
3. Enter title/body, select your iOS app, send

### Option B — Supabase Edge Function (automated)

Create a Supabase Edge Function that fires when certain database events happen (e.g. new prayer request approved, new announcement posted):

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std/http/server.ts'

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

serve(async (req) => {
  const { token, title, body } = await req.json()

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
    }),
  })

  return new Response(JSON.stringify(await response.json()))
})
```

Deploy with:
```bash
supabase functions deploy send-notification
```

### Option C — Supabase Database Webhook (fully automated)

Set a database webhook on the `announcements` table that triggers the Edge Function whenever a new row is inserted with `status = 'published'`. Configure in Supabase Dashboard → **Database** → **Webhooks**.

---

## Step 9 — Token Refresh

FCM tokens can change. Listen for refreshes and update your database:

```typescript
messaging().onTokenRefresh(async token => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('push_tokens')
      .upsert({ user_id: user.id, token, platform: 'ios' }, { onConflict: 'user_id' })
  }
})
```

---

## Common Issues

| Problem | Fix |
|---|---|
| Notifications work on simulator but not device | APNs key not uploaded to Firebase, or wrong Team/Key ID |
| Permission dialog never shows | Must call `requestPermission()` — iOS requires explicit request |
| Foreground notifications don't appear | Expected — use Notifee's `displayNotification()` in `onMessage` handler |
| Token is null | Device must have internet + Google Play Services (Android) / valid APNs setup (iOS) |
| Background notifications not delivered | Check Background Modes capability in Xcode |

---

## Checklist for Each New App

- [ ] Create Firebase project and add iOS app
- [ ] Download and add `GoogleService-Info.plist` to Xcode (not git)
- [ ] Create APNs key in Apple Developer portal
- [ ] Upload APNs key to Firebase Cloud Messaging settings
- [ ] Add Push Notifications + Background Modes capabilities in Xcode
- [ ] Install `@react-native-firebase/app`, `@react-native-firebase/messaging`, `@notifee/react-native`
- [ ] Add `[FIRApp configure]` to AppDelegate.mm
- [ ] Run `pod install`
- [ ] Call `requestPermission()` after login
- [ ] Save FCM token to database
- [ ] Handle foreground notifications with Notifee
- [ ] Create Edge Function or webhook to trigger sends
- [ ] Test on a real device (push notifications do not work on iOS simulator)
