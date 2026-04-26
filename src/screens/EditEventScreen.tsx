import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const GREEN = '#1a4725'

function to12h(value: string): string {
  if (!value) return ''
  const [hh, mm] = value.split(':')
  const h = Number(hh)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${mm.padStart(2, '0')} ${suffix}`
}

function to24h(amPm: string): string {
  const m = amPm.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
  if (!m) return ''
  const [, hStr, mm, ap] = m
  let h = Number(hStr)
  if (ap.toUpperCase() === 'PM' && h !== 12) h += 12
  if (ap.toUpperCase() === 'AM' && h === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${mm}`
}

export default function EditEventScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const eventId = route.params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [timeRaw, setTimeRaw] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'garden_hangouts' | 'serve_community'>('garden_hangouts')
  const [status, setStatus] = useState<'published' | 'draft'>('published')

  useEffect(() => { loadEvent() }, [eventId])

  const loadEvent = async () => {
    if (!eventId) return
    try {
      const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single()
      if (error || !data) { Alert.alert('Error', 'Failed to load event'); navigation.goBack(); return }
      setEvent(data)
      setTitle(data.title); setDate(data.date); setLocation(data.location)
      setDescription(data.description); setType(data.type); setStatus(data.status)
      setTimeRaw(to24h(data.time || ''))
    } catch { Alert.alert('Error', 'Failed to load event'); navigation.goBack() }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !date.trim() || !timeRaw.trim() || !location.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields'); return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('events').update({
        title: title.trim(), date: date.trim(), time: to12h(timeRaw),
        location: location.trim(), description: description.trim(),
        type, status, updated_at: new Date().toISOString(),
      }).eq('id', eventId)
      if (error) { Alert.alert('Error', `Failed to update event: ${error.message}`); return }
      navigation.goBack()
    } catch { Alert.alert('Error', 'An unexpected error occurred') }
    finally { setSaving(false) }
  }

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeleting(true)
        try {
          const { error } = await supabase.from('events').delete().eq('id', eventId)
          if (error) { Alert.alert('Error', 'Failed to delete event'); return }
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
        <Text style={styles.loadingText}>Loading event...</Text>
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

          <Text style={styles.pageTitle}>Edit Event</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Event title" />

          <Text style={styles.label}>Event Type *</Text>
          <View style={styles.chipRow}>
            {(['garden_hangouts', 'serve_community'] as const).map(t => (
              <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                  {t === 'garden_hangouts' ? 'Garden Hangouts' : 'Serve Our Community'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2025-06-15" keyboardType="numbers-and-punctuation" />

          <Text style={styles.label}>Time * (HH:MM, 24-hour)</Text>
          <TextInput style={styles.input} value={timeRaw} onChangeText={setTimeRaw} placeholder="14:00" keyboardType="numbers-and-punctuation" />
          {timeRaw ? <Text style={styles.hint}>Display: {to12h(timeRaw)}</Text> : null}

          <Text style={styles.label}>Location *</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Event location" />

          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Event description" multiline textAlignVertical="top" />

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {(['published', 'draft'] as const).map(s => (
              <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, (saving || deleting) && styles.btnDisabled]} onPress={handleSubmit} disabled={saving || deleting}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>💾 Update Event</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving || deleting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          {event && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Event Information</Text>
              <Text style={styles.infoText}>Created: {new Date(event.created_at).toLocaleString()}</Text>
              {event.updated_at && <Text style={styles.infoText}>Updated: {new Date(event.updated_at).toLocaleString()}</Text>}
            </View>
          )}
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
  textarea: { minHeight: 120, paddingTop: 12 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#6b7280', fontSize: 15 },
  infoBox: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginTop: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
})
