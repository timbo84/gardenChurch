import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const GREEN = '#1a4725'
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function EditCellGroupScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const groupId = route.params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [originalGroup, setOriginalGroup] = useState<any>(null)
  const [name, setName] = useState('')
  const [meetingDay, setMeetingDay] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [email, setEmail] = useState('')
  const [groupStatus, setGroupStatus] = useState<'open' | 'full'>('open')

  useEffect(() => { loadData() }, [groupId])

  const loadData = async () => {
    if (!groupId) return
    try {
      const { data, error } = await supabase.from('cell_groups').select('*').eq('id', groupId).single()
      if (error || !data) { Alert.alert('Error', 'Cell group not found'); navigation.goBack(); return }
      setOriginalGroup(data)
      setName(data.name); setMeetingDay(data.meeting_day)
      setMeetingTime(data.meeting_time); setEmail(data.email); setGroupStatus(data.status)
    } catch { Alert.alert('Error', 'Failed to load cell group'); navigation.goBack() }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!name.trim() || !meetingDay || !meetingTime.trim() || !email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields'); return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { Alert.alert('Error', 'Please enter a valid email address'); return }

    setSaving(true)
    try {
      const { error } = await supabase.from('cell_groups').update({
        name: name.trim(), status: groupStatus, meeting_day: meetingDay,
        meeting_time: meetingTime.trim(), email: email.trim(),
      }).eq('id', groupId)
      if (error) { Alert.alert('Error', 'Failed to update cell group'); return }
      navigation.goBack()
    } catch { Alert.alert('Error', 'An unexpected error occurred') }
    finally { setSaving(false) }
  }

  const handleDelete = () => {
    Alert.alert('Delete Cell Group', `Are you sure you want to delete "${originalGroup?.name}"? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeleting(true)
        try {
          const { error } = await supabase.from('cell_groups').delete().eq('id', groupId)
          if (error) { Alert.alert('Error', 'Failed to delete cell group'); return }
          navigation.goBack()
        } catch { Alert.alert('Error', 'An unexpected error occurred') }
        finally { setDeleting(false) }
      }}
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading cell group...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
              {deleting ? <ActivityIndicator size="small" color="#dc2626" /> : <Text style={styles.deleteBtnText}>🗑️ Delete</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>👥 Edit Cell Group</Text>

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

          {originalGroup && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Group Information</Text>
              <Text style={styles.infoText}>Created: {new Date(originalGroup.created_at).toLocaleDateString()}</Text>
              <Text style={styles.infoText}>Group ID: {originalGroup.id}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.btn, (saving || deleting) && styles.btnDisabled]} onPress={handleSubmit} disabled={saving || deleting}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>💾 Update Cell Group</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving || deleting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  container: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backText: { color: GREEN, fontSize: 14, fontWeight: '500' },
  deleteBtn: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 16, backgroundColor: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  infoBox: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 24 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#6b7280', fontSize: 15 },
})
