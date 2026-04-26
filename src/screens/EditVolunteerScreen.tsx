import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const GREEN = '#1a4725'
const CATEGORIES = ['helps', 'next_gen', 'hospitality', 'providence'] as const
type Category = typeof CATEGORIES[number]

export default function EditVolunteerScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const opportunityId = route.params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [opportunity, setOpportunity] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [commitment, setCommitment] = useState('')
  const [contact, setContact] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [signupLink, setSignupLink] = useState('')
  const [category, setCategory] = useState<Category>('helps')
  const [status, setStatus] = useState<'published' | 'draft'>('published')

  const getCategoryLabel = (c: string) => ({ helps: 'Helps', next_gen: 'Next Gen', hospitality: 'Hospitality', providence: 'Providence' }[c] || c)

  useEffect(() => { loadOpportunity() }, [opportunityId])

  const loadOpportunity = async () => {
    if (!opportunityId) return
    try {
      const { data, error } = await supabase.from('volunteer_opportunities').select('*').eq('id', opportunityId).single()
      if (error || !data) { Alert.alert('Error', 'Failed to load volunteer opportunity'); navigation.goBack(); return }
      setOpportunity(data)
      setTitle(data.title); setDescription(data.description); setCommitment(data.commitment)
      setContact(data.contact); setContactEmail(data.contact_email || '')
      setSignupLink(data.signup_link || ''); setCategory(data.category); setStatus(data.status)
    } catch { Alert.alert('Error', 'Failed to load volunteer opportunity'); navigation.goBack() }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !commitment.trim() || !contact.trim() || !contactEmail.trim()) {
      Alert.alert('Error', 'Please fill in all required fields'); return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contactEmail)) { Alert.alert('Error', 'Please enter a valid email address'); return }
    if (signupLink.trim()) {
      try { new URL(signupLink.trim()) } catch { Alert.alert('Error', 'Please enter a valid URL for the signup link'); return }
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('volunteer_opportunities').update({
        title: title.trim(), description: description.trim(), commitment: commitment.trim(),
        contact: contact.trim(), contact_email: contactEmail.trim(),
        signup_link: signupLink.trim() || null, category, status,
        updated_at: new Date().toISOString(),
      }).eq('id', opportunityId)
      if (error) { Alert.alert('Error', `Failed to update: ${error.message}`); return }
      navigation.goBack()
    } catch { Alert.alert('Error', 'An unexpected error occurred') }
    finally { setSaving(false) }
  }

  const handleDelete = () => {
    Alert.alert('Delete', 'Are you sure you want to delete this volunteer opportunity? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeleting(true)
        try {
          const { error } = await supabase.from('volunteer_opportunities').delete().eq('id', opportunityId)
          if (error) { Alert.alert('Error', 'Failed to delete volunteer opportunity'); return }
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
        <Text style={styles.loadingText}>Loading volunteer opportunity...</Text>
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

          <Text style={styles.pageTitle}>Edit Volunteer Opportunity</Text>

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

          <TouchableOpacity style={[styles.btn, (saving || deleting) && styles.btnDisabled]} onPress={handleSubmit} disabled={saving || deleting}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>💾 Update Opportunity</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving || deleting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          {opportunity && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Information</Text>
              <Text style={styles.infoText}>Created: {new Date(opportunity.created_at).toLocaleDateString()}</Text>
              {opportunity.updated_at && <Text style={styles.infoText}>Updated: {new Date(opportunity.updated_at).toLocaleDateString()}</Text>}
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
