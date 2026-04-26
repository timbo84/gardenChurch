import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const GREEN = '#1a4725'
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function NewCellGroupScreen() {
  const navigation = useNavigation<any>()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [meetingDay, setMeetingDay] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [email, setEmail] = useState('')
  const [groupStatus, setGroupStatus] = useState<'open' | 'full'>('open')

  const handleSubmit = async () => {
    if (!name.trim() || !meetingDay || !meetingTime.trim() || !email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert('Error', 'You must be logged in'); return }

      const { error } = await supabase.from('cell_groups').insert([{
        name: name.trim(), status: groupStatus,
        meeting_day: meetingDay, meeting_time: meetingTime.trim(),
        email: email.trim(), created_by: user.id,
      }])

      if (error) { Alert.alert('Error', 'Failed to create cell group'); return }
      // TODO: notifyNewCellGroup(name, user.email) — requires @notifee/react-native
      navigation.goBack()
    } catch { Alert.alert('Error', 'An unexpected error occurred') }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back to Cell Groups</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>👥 Create New Cell Group</Text>

          <Text style={styles.label}>Group Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g., Sunday Morning Bible Study" />

          <Text style={styles.label}>Meeting Day *</Text>
          <View style={styles.chipRow}>
            {DAYS.map(d => (
              <TouchableOpacity key={d} style={[styles.chip, meetingDay === d && styles.chipActive]} onPress={() => setMeetingDay(d)}>
                <Text style={[styles.chipText, meetingDay === d && styles.chipTextActive]}>{d.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Meeting Time *</Text>
          <TextInput style={styles.input} value={meetingTime} onChangeText={setMeetingTime} placeholder="e.g., 7:00 PM, 10:00 AM" />

          <Text style={styles.label}>Leader Email *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="leader@gardenchurch.org" keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.hint}>This email will be visible to members interested in joining the group</Text>

          <Text style={styles.label}>Group Status</Text>
          <View style={styles.chipRow}>
            {(['open', 'full'] as const).map(s => (
              <TouchableOpacity key={s} style={[styles.chip, groupStatus === s && styles.chipActive]} onPress={() => setGroupStatus(s)}>
                <Text style={[styles.chipText, groupStatus === s && styles.chipTextActive]}>
                  {s === 'open' ? 'Open (Accepting members)' : 'Full (Not accepting)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Cell Group Guidelines</Text>
            <Text style={styles.infoText}>• Groups typically meet weekly for 1-2 hours</Text>
            <Text style={styles.infoText}>• Include time for fellowship, Bible study, and prayer</Text>
            <Text style={styles.infoText}>• Keep groups small (6-12 people) for intimate community</Text>
            <Text style={styles.infoText}>• Contact information will be visible to interested members</Text>
          </View>

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>💾 Create Cell Group</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { color: GREEN, fontSize: 14, fontWeight: '500' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 16, backgroundColor: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 16 },
  infoBox: { backgroundColor: '#f0f7f2', borderWidth: 1, borderColor: `${GREEN}33`, borderRadius: 10, padding: 16, marginBottom: 24 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: GREEN, marginBottom: 8 },
  infoText: { fontSize: 13, color: '#374151', marginBottom: 4 },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#6b7280', fontSize: 15 },
})
