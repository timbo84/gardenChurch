/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Handle FCM messages when app is in background or quit state.
// Must be registered before AppRegistry.registerComponent.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  const notifee = require('@notifee/react-native').default;

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // iOS: APNs already shows the notification via the notification key in the payload.
    // Android: data-only message — Notifee is the only display path.
    const { Platform } = require('react-native');
    if (Platform.OS === 'ios') return;

    const title = remoteMessage.data?.title ?? 'Our Garden';
    const body = remoteMessage.data?.body ?? '';

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: 'default',
        pressAction: { id: 'default' },
        importance: 4,
        sound: 'default',
      },
    });
  });
} catch {
  // Firebase not configured yet
}

AppRegistry.registerComponent(appName, () => App);
