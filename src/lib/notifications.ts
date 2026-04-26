import { Platform, PermissionsAndroid } from 'react-native'
import { supabase } from './supabase'

let messaging: any = null
let notifee: any = null

try {
  messaging = require('@react-native-firebase/messaging').default
} catch {
  console.warn('Firebase messaging not available')
}

try {
  notifee = require('@notifee/react-native').default
} catch {
  console.warn('Notifee not available')
}

async function saveToken(userId: string, token: string) {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform: Platform.OS },
      { onConflict: 'user_id' }
    )
  if (error) console.error('Failed to save push token:', error)
  else console.log('Push token saved:', Platform.OS, token)
}

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!messaging) {
    console.warn('Messaging not available, skipping push registration')
    return
  }

  try {
    // Android 13+ requires explicit POST_NOTIFICATIONS permission
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      )
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Push notification permission denied')
        return
      }
    }

    // Request permission (iOS) — also triggers APNs registration
    const authStatus = await messaging().requestPermission()
    console.log('Push auth status:', authStatus)

    // 1 = AUTHORIZED, 2 = PROVISIONAL, 3 = EPHEMERAL (all valid on iOS)
    if (Platform.OS === 'ios' && authStatus < 1) {
      console.log('Push notification permission denied, status:', authStatus)
      return
    }

    // Get FCM token — on iOS this requires APNs token to be ready
    const token = await messaging().getToken()
    console.log('FCM token:', token)
    if (token) {
      await saveToken(userId, token)
    } else {
      // Token not ready yet — onTokenRefresh will fire when it becomes available
      console.log('FCM token not ready, will save on refresh')
    }
  } catch (err) {
    console.error('Error registering for push notifications:', err)
  }
}

export async function createNotificationChannel(): Promise<void> {
  if (!notifee || Platform.OS !== 'android') return
  await notifee.createChannel({
    id: 'default',
    name: 'Our Garden Notifications',
    importance: 4, // HIGH
    sound: 'default',
  })
}

export function setupForegroundNotifications(): (() => void) | undefined {
  if (!messaging || !notifee) return

  // Show notification banner when app is in foreground
  const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
    const title = remoteMessage.data?.title ?? remoteMessage.notification?.title ?? 'Our Garden'
    const body = remoteMessage.data?.body ?? remoteMessage.notification?.body ?? ''
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: 'default',
        pressAction: { id: 'default' },
        importance: 4,
        sound: 'default',
      },
      ios: {
        sound: 'default',
      },
    })
  })

  return unsubscribe
}

export function setupBackgroundNotificationHandler(): void {
  if (!messaging) return

  // Handle notification tap when app was in background
  messaging().onNotificationOpenedApp((remoteMessage: any) => {
    console.log('Notification opened from background:', remoteMessage)
    // Navigation can be wired here once you have a navigationRef
  })

  // Handle notification tap when app was quit
  messaging()
    .getInitialNotification()
    .then((remoteMessage: any) => {
      if (remoteMessage) {
        console.log('Notification opened from quit state:', remoteMessage)
      }
    })
}

export function setupTokenRefresh(userId: string): (() => void) | undefined {
  if (!messaging) return

  const unsubscribe = messaging().onTokenRefresh(async (token: string) => {
    console.log('FCM token refreshed:', Platform.OS, token)
    await saveToken(userId, token)
  })

  return unsubscribe
}
