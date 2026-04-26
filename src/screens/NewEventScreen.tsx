import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
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

export default function NewEventScreen() {
  const navigation = useNavigation<any>()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'garden_hangouts' | 'serve_community'>('garden_hangouts')
  const [status, setStatus] = useState<'published' | 'draft'>('published')

  const handleSubmit = async () => {
    if (!title.trim() || !date.trim() || !time.trim() || !location.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { Alert.alert('Error', 'You must be logged in to create events'); return }

      const { error } = await supabase.from('events').insert([{
        title: title.trim(), date: date.trim(),
        time: to12h(time.trim()), location: location.trim(),
        description: description.trim(), type, status, created_by: user.id,
      }])

      if (error) { Alert.alert('Error', `Failed to create event: ${error.message}`); return }
      // TODO: notifyNewEvent(title, date, location) — requires @notifee/react-native
      navigation.goBack()
    } catch { Alert.alert('Error', 'An unexpected error occurred') }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back to Events</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>Create New Event</Text>
          <Text style={styles.pageSubtitle}>Add a new event for the community.</Text>

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
          <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="14:00" keyboardType="numbers-and-punctuation" />
          {time ? <Text style={styles.hint}>Display: {to12h(time)}</Text> : null}

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

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{status === 'published' ? 'Publish Event' : 'Save Draft'}</Text>}
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
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
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
})
