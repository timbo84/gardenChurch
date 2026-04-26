import React, { useState } from 'react'
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
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const GREEN = '#1a4725'

const TYPES = ['general', 'service', 'event', 'group', 'update', 'opportunity'] as const
type AnnouncementType = typeof TYPES[number]

export default function NewAnnouncementScreen() {
  const navigation = useNavigation<any>()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [type, setType] = useState<AnnouncementType>('general')
  const [status, setStatus] = useState<'published' | 'draft'>('published')

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

    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        Alert.alert('Error', 'You must be logged in to create announcements')
        return
      }

      const { error } = await supabase.from('announcements').insert([{
        title: title.trim(),
        content: content.trim(),
        contact_email: contactEmail.trim() || null,
        type,
        status,
        created_by: user.id,
      }])

      if (error) {
        Alert.alert('Error', 'Failed to create announcement')
        return
      }

      // TODO: Send push notification if status === 'published'
      // notifyNewAnnouncement(title, content) — requires @notifee/react-native

      navigation.goBack()
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back to Announcements</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>Create New Announcement</Text>
          <Text style={styles.pageSubtitle}>Share important news with your church community</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter announcement title..."
            maxLength={200}
          />
          <Text style={styles.charCount}>{title.length}/200 characters</Text>

          <Text style={styles.label}>Content *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={content}
            onChangeText={setContent}
            placeholder="Write your announcement content here..."
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{content.length}/2000 characters</Text>

          <Text style={styles.label}>Contact Email (Optional)</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="contact@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, type === t && styles.chipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {(['published', 'draft'] as const).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, status === s && styles.chipActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, (!title.trim() || !content.trim() || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!title.trim() || !content.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{status === 'published' ? 'Publish Announcement' : 'Save Draft'}</Text>
            }
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
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 8, backgroundColor: '#fff' },
  textarea: { minHeight: 120, paddingTop: 12 },
  charCount: { fontSize: 11, color: '#9ca3af', marginBottom: 16, textAlign: 'right' },
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
