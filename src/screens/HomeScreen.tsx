import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import NavBar from '../components/main-nav';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../lib/supabase';
import Icon from '../components/Icon';
import { registerForPushNotifications, setupTokenRefresh } from '../lib/notifications';

// ─── Types ───────────────────────────────────────────────────────────────────

type DailyCounts = {
  prayer_requests: number;
  events: number;
  announcements: number;
  love_actions: number;
  volunteer_opportunities: number;
};

type QuickLinkCardProps = {
  icon: string;           // emoji used as icon replacement
  title: string;
  description: string;
  content: string;
  route: string;          // React Navigation route name (replaces href)
  newCount?: number;
};

// ─── QuickLinkCard ───────────────────────────────────────────────────────────

function QuickLinkCard({
  icon,
  title,
  description,
  content,
  route,
  newCount = 0,
}: QuickLinkCardProps) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.card}>
      {newCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{newCount}</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <Icon name={icon} size={22} color="#1a4725" />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      <Text style={styles.cardContent}>{content}</Text>
      <TouchableOpacity
        style={styles.cardButton}
        onPress={() => navigation.navigate(route)}
        activeOpacity={0.75}
      >
        <Text style={styles.cardButtonText}>Learn More →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── DailyAlertBanner ────────────────────────────────────────────────────────

function DailyAlertBanner({ counts }: { counts: DailyCounts }) {
  const alerts = [
    { key: 'prayer_requests',         label: 'new prayers',                count: counts.prayer_requests },
    { key: 'events',                  label: 'new events',                 count: counts.events },
    { key: 'announcements',           label: 'new announcements',          count: counts.announcements },
    { key: 'love_actions',            label: 'new love actions',           count: counts.love_actions },
    { key: 'volunteer_opportunities', label: 'new volunteer opportunities', count: counts.volunteer_opportunities },
  ].filter(a => a.count > 0);

  if (alerts.length === 0) return null;

  return (
    <View style={styles.alertBanner}>
      <Icon name="notifications-outline" size={20} color="#1E3A5F" style={styles.alertIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.alertTitle}>New Today</Text>
        <View style={styles.alertBadgesRow}>
          {alerts.map(alert => (
            <View key={alert.key} style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>
                {alert.count} {alert.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [dailyCounts, setDailyCounts] = useState<DailyCounts>({
    prayer_requests: 0,
    events: 0,
    announcements: 0,
    love_actions: 0,
    volunteer_opportunities: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDailyCounts = async () => {
      try {
        // Register for push notifications
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          registerForPushNotifications(user.id)
          setupTokenRefresh(user.id)
        }

        // Use Central Time (San Angelo, TX) so "today" rolls over at midnight local time
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const [prayers, events, announcements, loveActions, volunteer] = await Promise.all([
          supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', today),
          supabase.from('events').select('id', { count: 'exact', head: true }).gte('created_at', today),
          supabase.from('announcements').select('id', { count: 'exact', head: true }).gte('created_at', today),
          supabase.from('love_actions').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', today),
          supabase.from('volunteer_opportunities').select('id', { count: 'exact', head: true }).gte('created_at', today),
        ])
        setDailyCounts({
          prayer_requests: prayers.count ?? 0,
          events: events.count ?? 0,
          announcements: announcements.count ?? 0,
          love_actions: loveActions.count ?? 0,
          volunteer_opportunities: volunteer.count ?? 0,
        })
      } catch (error) {
        console.error('Error fetching daily counts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDailyCounts();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <NavBar />
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.banner}>
          <LinearGradient
            colors={['#CBAF8B', '#A07C54']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.bannerTitle}>Exact Obedience</Text>
          <Text style={styles.bannerSubtitle}>Rooted in Love, grown through devotion</Text>
        </View>

        {/* Daily alert */}
        {!loading && <DailyAlertBanner counts={dailyCounts} />}
        {loading && <ActivityIndicator style={{ marginVertical: 16 }} color="#1a4725" />}

        {/* Cards — Row 1 */}
        <Text style={styles.sectionTitle}>Connect</Text>
        <View style={styles.row}>
          <QuickLinkCard
            icon="megaphone-outline"
            title="Announcements"
            description="Stay updated with church news"
            content="View the latest announcements and important updates from our church leadership."
            route="Announcements"
            newCount={dailyCounts.announcements}
          />
          <QuickLinkCard
            icon="hand-left-outline"
            title="Prayer Requests"
            description="Submit your prayer needs"
            content="Share your prayer requests with the church family and receive support."
            route="PrayerRequests"
            newCount={dailyCounts.prayer_requests}
          />
          <QuickLinkCard
            icon="calendar-outline"
            title="Events"
            description="Join us for upcoming events"
            content="Discover worship services, classes, and conferences happening in our community."
            route="Events"
            newCount={dailyCounts.events}
          />
        </View>

        {/* Cards — Row 2 */}
        <View style={styles.row}>
          <QuickLinkCard
            icon="people-outline"
            title="Volunteer"
            description="Serve our church and community"
            content="Find opportunities to serve and make a difference with your time and talents."
            route="Volunteer"
            newCount={dailyCounts.volunteer_opportunities}
          />
          <QuickLinkCard
            icon="heart-outline"
            title="Love in Action"
            description="Ask for Support or Be the Helping Hand"
            content="Life gets busy, but you're never alone. From carrying boxes to sharing a warm meal, we're here for each other."
            route="LoveAction"
            newCount={dailyCounts.love_actions}
          />
          <QuickLinkCard
            icon="people-circle-outline"
            title="Cell Groups"
            description="Connect in smaller communities"
            content="Join a Cell group for deeper fellowship, Bible study, and spiritual growth."
            route="CellGroups"
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const GREEN = '#1a4725';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },


  // Alert banner
  alertBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  alertIcon: {
    marginTop: 1,
  },
  alertTitle: {
    color: '#1E3A5F',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 6,
  },
  alertBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  alertBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  alertBadgeText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Section
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flexShrink: 1,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 14,
  },
  cardButton: {
    borderWidth: 1,
    borderColor: `${GREEN}40`,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cardButtonText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '500',
  },
});
