'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') {
        setIsSubscribed(false);
        return;
      }

      // Only check for existing subscription if a service worker is already registered
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) {
        setIsSubscribed(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setIsSubscribed(!!existing);
    } catch {
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function subscribeToNotifications() {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to enable notifications');
        return;
      }

      // Unregister any old service workers and register sw.js fresh
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of existingRegistrations) {
        await reg.unregister();
      }
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Wait for sw.js to become active
      await new Promise<void>((resolve) => {
        if (registration.active) {
          resolve();
        } else {
          const sw = registration.installing || registration.waiting;
          if (sw) {
            sw.addEventListener('statechange', function handler(e) {
              if ((e.target as ServiceWorker).state === 'activated') {
                sw.removeEventListener('statechange', handler);
                resolve();
              }
            });
          } else {
            resolve();
          }
        }
      });

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please allow notifications in your browser settings');
        return;
      }

      // Subscribe via Web Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      // Save to Supabase — conflict on endpoint so each device gets its own row
      const subJson = subscription.toJSON() as { endpoint: string };
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subJson.endpoint,
          subscription: subscription.toJSON(),
          preferences: {
            prayer_requests: true,
            prayer_responses: true,
            announcements: true,
            events: true,
            volunteer_opportunities: true,
            love_actions: true,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' });

      if (error) throw error;

      setIsSubscribed(true);
      alert('Notifications enabled!');
    } catch (error) {
      console.error('Error subscribing to notifications:', JSON.stringify(error), error);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribeFromNotifications() {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      const { data: { user } } = await supabase.auth.getUser();
      if (user && subscription) {
        const subJson = subscription.toJSON() as { endpoint: string };
        await supabase.from('push_subscriptions').delete().eq('endpoint', subJson.endpoint);
      }

      setIsSubscribed(false);
      alert('Notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      alert('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  return (
    <button
      onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
      disabled={isLoading}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isSubscribed
          ? 'bg-gray-500 hover:bg-gray-600 text-white'
          : 'bg-[#1a4725] hover:bg-[#153a1e] text-white'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isLoading
        ? 'Loading...'
        : isSubscribed
        ? '🔕 Disable Notifications'
        : '🔔 Enable Notifications'}
    </button>
  );
}
