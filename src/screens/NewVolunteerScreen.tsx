import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const GREEN = '#1a4725'
const CATEGORIES = ['helps', 'next_gen', 'hospitality', 'providence'] as const
type Category = typeof CATEGORIES[number]

export default function NewVolunteerScreen() {
  const navigation = useNavigation<any>()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [commitment, setCommitment] = useState('')
  const [contact, setContact] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [signupLink, setSignupLink] = useState('')
  const [category, setCategory] = useState<Category>('helps')
  const [status, setStatus] = useState<'published' | 'draft'>('published')

  const getCategoryLabel = (c: Category) => ({ helps: 'Helps', next_gen: 'Next Gen', hospitality: 'Hospitality', providence: 'Providence' }[c])

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !commitment.trim() || !contact.trim() || !contactEmail.trim()) {
      Alert.alert('Error', 'Please fill in all required fields'); return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contactEmail)) { Alert.alert('Error', 'Please enter a valid email address'); return }
    if (signupLink.trim()) {
      try { new URL(signupLink.trim()) } catch { Alert.alert('Error', 'Please enter a valid URL for the signup link (must start with http:// or https://)'); return }
    }

    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { Alert.alert('Error', 'You must be logged in to create volunteer opportunities'); return }

      const { error } = await supabase.from('volunteer_opportunities').insert([{
        title: title.trim(), description: description.trim(), commitment: commitment.trim(),
        contact: contact.trim(), contact_email: contactEmail.trim(),
        signup_link: signupLink.trim() || null,
        category, status, created_by: user.id,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }])

      if (error) { Alert.alert('Error', `Failed to create volunteer opportunity: ${error.message}`); return }
      // TODO: notifyNewVolunteerOpportunity(title, commitment) — requires @notifee/react-native
      navigation.goBack()
    } catch { Alert.alert('Error', 'An unexpected error occurred') }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>Create Volunteer Opportunity</Text>
          <Text style={styles.pageSubtitle}>Add a new way to serve the community</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Volunteer opportunity title" />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{getCategoryLabel(c)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Contact Person *</Text>
          <TextInput style={styles.input} value={contact} onChangeText={setContact} placeholder="Contact person name" />

          <Text style={styles.label}>Contact Email *</Text>
          <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail} placeholder="contact@example.com" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Sign Up Link (Optional)</Text>
          <TextInput style={styles.input} value={signupLink} onChangeText={setSignupLink} placeholder="https://www.signupgenius.com/go/..." autoCapitalize="none" keyboardType="url" />
          <Text style={styles.hint}>If provided, volunteers will see a "Sign Up" button. Otherwise, they will see "Contact to Join" that emails the contact person.</Text>

          <Text style={styles.label}>Time Commitment *</Text>
          <TextInput style={styles.input} value={commitment} onChangeText={setCommitment} placeholder="e.g., One Sunday per month, 9:30 AM - 12:00 PM" />

          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Describe the volunteer opportunity" multiline textAlignVertical="top" />

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {(['published', 'draft'] as const).map(s => (
              <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{status === 'published' ? '📢 Publish Opportunity' : '📝 Save Draft'}</Text>}
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
