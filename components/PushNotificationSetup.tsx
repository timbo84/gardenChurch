'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';

/**
 * PushNotificationSetup Component
 * Handles Firebase Cloud Messaging setup for web push notifications
 * Works on all browsers (Chrome, Firefox, Edge, Safari 16.4+)
 */
export default function PushNotificationSetup() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const setupPushNotifications = async () => {
      try {
        console.log('🔔 Starting Firebase push notification setup...');
        
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Check if user is logged in
        console.log('Checking user authentication...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.log('⚠️ User not logged in, skipping push notification setup');
          return;
        }
        
        console.log('✅ User authenticated:', user.email);

        // Request notification permission and get FCM token
        console.log('🔔 Step 1: Requesting notification permission and FCM token...');
        const fcmToken = await requestNotificationPermission();
        
        if (!fcmToken) {
          console.log('❌ Failed to get FCM token (permission denied or not supported)');
          return;
        }

        // Save FCM token to database
        console.log('💾 Saving FCM token to database...');
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: { fcm_token: fcmToken },
            preferences: {
              prayer_requests: true,
              prayer_responses: true,
              announcements: true,
              events: true,
              volunteer_opportunities: true,
              love_actions: true,
            },
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('❌ Error saving FCM token:', error);
        } else {
          console.log('✅ FCM token saved to database!');
          console.log('🎉 Firebase push notifications are now active!');
        }

        // Listen for foreground messages
        onMessageListener();

        setInitialized(true);

      } catch (error) {
        console.error('❌ Error setting up Firebase push notifications:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      }
    };

    // Auto-registration disabled — notifications are managed via NotificationButton
    // if (!initialized) {
    //   setupPushNotifications();
    // }
  }, [initialized]);

  return null;
}
