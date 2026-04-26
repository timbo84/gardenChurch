/**
 * NavBar — top navigation bar with auth state and sign-out.
 *
 * ⚠️  REQUIRES INSTALLATION:
 *   npm install @supabase/supabase-js
 *
 * Changes from web version:
 *   - next/link → useNavigation().navigate()
 *   - next/image → Image from react-native
 *   - lucide-react icons → emoji placeholders
 *     (install react-native-vector-icons for proper icons)
 *   - Desktop nav hidden — mobile nav becomes the primary pattern
 *   - @supabase/ssr createBrowserClient → @supabase/supabase-js createClient
 *
 * Integration tip: use this as a custom header component in your navigator:
 *   <Stack.Screen name="Home" options={{ header: () => <NavBar /> }} />
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import Icon from './Icon';

const GREEN = '#1a4725';
const GOLD = '#9f7a49';

interface UserProfile {
  role: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
}

// TODO: replace stub with real Supabase types once @supabase/supabase-js is installed
type AuthUser = { id: string; email: string } | null;

export default function NavBar() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AuthUser>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchUserAndProfile();
  }, []);

  async function fetchUserAndProfile() {
    try {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { setUser(null); setProfile(null); return; }
      setUser({ id: user.id, email: user.email ?? '' });

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('role, first_name, last_name, email')
        .eq('user_id', user.id)
        .single();
      setProfile(profileData ? {
        role: profileData.role || null,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
      } : null);
    } catch (error) {
      console.error('Auth error:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setMenuOpen(false);
      navigation.replace('Login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  function getDisplayName(): string {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'User';
  }

  const role = profile?.role;
  const isAdmin = role === 'admin';
  const canAccessPrayer = ['admin', 'member'].includes(role || '');

  const navLinks = [
    { label: 'Announcements', route: 'Announcements', show: !!user },
    { label: 'Events', route: 'Events', show: canAccessPrayer },
    { label: 'Prayer Requests', route: 'PrayerRequests', show: canAccessPrayer },
    { label: 'Volunteer', route: 'Volunteer', show: !!user },
    { label: 'Love in Action', route: 'LoveAction', show: !!user },
    { label: 'Cell Group', route: 'CellGroups', show: !!user },
    { label: 'Admin', route: 'Admin', show: isAdmin },
    { label: 'Settings', route: 'Settings', show: !!user },
  ].filter(l => l.show);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        {/* Logo + brand */}
        <TouchableOpacity
          style={styles.brand}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.brandText}>Our Garden</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="small" color={GREEN} />
        ) : user ? (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuOpen(true)}
            activeOpacity={0.8}
          >
            <Icon name="menu" size={26} color={GREEN} />
          </TouchableOpacity>
        ) : (
          <View style={styles.authButtons}>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Slide-down menu modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.menuSheet, { paddingTop: insets.top + 8 }]}>
            {/* Close row */}
            <View style={styles.menuHeader}>
              <Text style={styles.brandText}>Our Garden</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)}>
                <Icon name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* User info */}
            {user && (
              <View style={styles.userInfo}>
                <Icon name="person-circle-outline" size={22} color={GREEN} />
                <Text style={styles.userName}>{getDisplayName()}</Text>
                {role && role !== 'guest' && (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{role}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Nav links */}
            <ScrollView style={styles.navLinks}>
              {navLinks.map(link => (
                <TouchableOpacity
                  key={link.route}
                  style={styles.navLink}
                  onPress={() => { navigation.navigate(link.route); setMenuOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navLinkText}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Sign out */}
            {user && (
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
                <Icon name="log-out-outline" size={16} color={GOLD} style={{ marginRight: 6 }} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            )}

          </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 22,
    color: GREEN,
  },
  authButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  loginBtn: {
    borderWidth: 1,
    borderColor: `${GREEN}50`,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loginBtnText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '500',
  },

  // Menu modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
  },
  menuSheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 24,
    minHeight: '50%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeIcon: {
    fontSize: 18,
    color: '#6B7280',
    padding: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userIcon: {
    fontSize: 16,
    color: GREEN,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  roleBadge: {
    backgroundColor: `${GREEN}15`,
    borderWidth: 1,
    borderColor: `${GREEN}30`,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: GREEN,
  },
  navLinks: {
    marginTop: 8,
  },
  navLink: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  navLinkText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  signOutBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: `${GOLD}50`,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signOutText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
});
