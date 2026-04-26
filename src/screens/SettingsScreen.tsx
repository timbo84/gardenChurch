import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import NavBar from '../components/main-nav'
import Icon from '../components/Icon'

const GREEN = '#1a4725'
const GOLD = '#9f7a49'

type NotifPrefs = {
  announcements: boolean
  events: boolean
  prayer_requests: boolean
  volunteer: boolean
  love_actions: boolean
  cell_groups: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  announcements: true,
  events: true,
  prayer_requests: true,
  volunteer: true,
  love_actions: true,
  cell_groups: true,
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>()

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigation.replace('Login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, notification_prefs')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        if (data.notification_prefs) {
          setNotifPrefs({ ...DEFAULT_PREFS, ...data.notification_prefs })
        }
      }
    } catch (err) {
      console.error('loadProfile error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First and last name cannot be empty.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ first_name: firstName.trim(), last_name: lastName.trim() })
        .eq('user_id', userId!)
      if (error) throw error
      Alert.alert('Saved', 'Your profile has been updated.')
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function saveNotifPrefs(updated: NotifPrefs) {
    if (!userId) return
    try {
      await supabase
        .from('user_profiles')
        .update({ notification_prefs: updated })
        .eq('user_id', userId)
    } catch (err) {
      console.error('saveNotifPrefs error:', err)
    }
  }

  function togglePref(key: keyof NotifPrefs) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(updated)
    saveNotifPrefs(updated)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigation.replace('Login')
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is permanent. Your account will be deleted and you will need to create a new account to use the app again. Proceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Forever', style: 'destructive', onPress: confirmDeleteAccount },
              ]
            )
          },
        },
      ]
    )
  }

  async function confirmDeleteAccount() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        'https://xndvgvtiylrfxjjfjevw.supabase.co/functions/v1/delete-account',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(`Failed: ${res.status} ${JSON.stringify(body)}`)
      }
      await supabase.auth.signOut()
      navigation.replace('Login')
    } catch (err) {
      Alert.alert('Error', 'Failed to delete account. Please try again.')
      console.error('Delete account error:', err)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <NavBar />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <NavBar />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* ── Profile ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              autoCapitalize="words"
            />
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              autoCapitalize="words"
            />
            <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Profile</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Notifications ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            {([
              { key: 'announcements', label: 'Announcements', icon: 'megaphone-outline' },
              { key: 'events', label: 'Events', icon: 'calendar-outline' },
              { key: 'prayer_requests', label: 'Prayer Requests', icon: 'hand-left-outline' },
              { key: 'volunteer', label: 'Volunteer Opportunities', icon: 'people-outline' },
              { key: 'love_actions', label: 'Love in Action', icon: 'heart-outline' },
              { key: 'cell_groups', label: 'Cell Groups', icon: 'people-circle-outline' },
            ] as { key: keyof NotifPrefs; label: string; icon: string }[]).map((item, index, arr) => (
              <View key={item.key} style={[styles.toggleRow, index < arr.length - 1 && styles.toggleBorder]}>
                <View style={styles.toggleLeft}>
                  <Icon name={item.icon} size={18} color={GREEN} style={{ marginRight: 10 }} />
                  <Text style={styles.toggleLabel}>{item.label}</Text>
                </View>
                <Switch
                  value={notifPrefs[item.key]}
                  onValueChange={() => togglePref(item.key)}
                  trackColor={{ false: '#e5e7eb', true: `${GREEN}70` }}
                  thumbColor={notifPrefs[item.key] ? GREEN : '#9ca3af'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* ── Account ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut}>
              <Icon name="log-out-outline" size={18} color={GOLD} style={{ marginRight: 10 }} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount}>
              <Icon name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── About ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>App Version</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Church</Text>
              <Text style={styles.aboutValue}>Our Garden</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f7f2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, paddingBottom: 40, gap: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 14, backgroundColor: '#fff' },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 2 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  toggleBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  toggleLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },
  signOutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  signOutText: { color: GOLD, fontSize: 15, fontWeight: '500' },
  deleteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: '#EF4444', fontSize: 15, fontWeight: '500' },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  aboutLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  aboutValue: { fontSize: 15, color: '#6B7280' },
})
