import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const GREEN = '#1a4725'

const TYPES = ['general', 'service', 'event', 'group', 'update', 'opportunity'] as const
type AnnouncementType = typeof TYPES[number]

export default function EditAnnouncementScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const announcementId = route.params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [announcement, setAnnouncement] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [type, setType] = useState<AnnouncementType>('general')
  const [status, setStatus] = useState<'published' | 'draft'>('published')

  useEffect(() => {
    loadAnnouncement()
  }, [announcementId])

  const loadAnnouncement = async () => {
    if (!announcementId) return
    try {
      const { data, error } = await supabase.from('announcements').select('*').eq('id', announcementId).single()
      if (error || !data) {
        Alert.alert('Error', 'Failed to load announcement')
        navigation.goBack()
        return
      }
      setAnnouncement(data)
      setTitle(data.title || '')
      setContent(data.content || '')
      setContactEmail(data.contact_email || '')
      setType(data.type || 'general')
      setStatus(data.status || 'published')
    } catch {
      Alert.alert('Error', 'Failed to load announcement')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }
    if (contactEmail && !isValidEmail(contactEmail)) {
      Alert.alert('Error', 'Please enter a valid email address')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('announcements').update({
        title: title.trim(), content: content.trim(),
        contact_email: contactEmail.trim() || null,
        type, status, updated_at: new Date().toISOString(),
      }).eq('id', announcementId)

      if (error) { Alert.alert('Error', `Failed to update: ${error.message}`); return }
      navigation.goBack()
    } catch {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert('Delete Announcement', 'Are you sure you want to delete this announcement? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true)
          try {
            const { error } = await supabase.from('announcements').delete().eq('id', announcementId)
            if (error) { Alert.alert('Error', 'Failed to delete announcement'); return }
            navigation.goBack()
          } catch {
            Alert.alert('Error', 'An unexpected error occurred')
          } finally {
            setDeleting(false)
          }
        }
      }
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading announcement...</Text>
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

          <Text style={styles.pageTitle}>Edit Announcement</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Announcement title" />

          <Text style={styles.label}>Type *</Text>
          <View style={styles.chipRow}>
            {TYPES.map(t => (
              <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Content *</Text>
          <TextInput style={[styles.input, styles.textarea]} value={content} onChangeText={setContent} placeholder="Announcement content" multiline textAlignVertical="top" />

          <Text style={styles.label}>Contact Email (Optional)</Text>
          <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail} placeholder="contact@example.com" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {(['published', 'draft'] as const).map(s => (
              <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Announcement</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          {announcement && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Information</Text>
              <Text style={styles.infoText}>Created: {new Date(announcement.created_at).toLocaleString()}</Text>
              {announcement.updated_at && <Text style={styles.infoText}>Updated: {new Date(announcement.updated_at).toLocaleString()}</Text>}
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
  deleteBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dc2626', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 16, backgroundColor: '#fff' },
  textarea: { minHeight: 120, paddingTop: 12 },
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
