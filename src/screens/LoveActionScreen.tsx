import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import NavBar from '../components/main-nav'
import Icon from '../components/Icon'
import { openMailto } from '../lib/openMailto'

const GREEN = '#1a4725'
const GOLD = '#9f7a49'

interface Opportunity {
  id: string; title: string; description: string; type: 'volunteer' | 'giving'
  category: string; location?: string; date_time?: string; volunteers_needed?: number
  status: string; created_at: string; user_id?: string
}

type FilterType = 'all' | 'volunteer' | 'giving'

const VOLUNTEER_CATEGORIES = ['Community Service', 'Church Events', 'Youth Ministry', 'Elderly Care', 'Education/Tutoring', 'Maintenance/Repairs', 'Administrative', 'Other']
const GIVING_CATEGORIES = ['Furniture', 'Clothing', 'Baby Items', 'Electronics', 'Books', 'Kitchen Items', 'Sports/Recreation', 'Other']

function LoveActionScreen() {
  const navigation = useNavigation<any>()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [newType, setNewType] = useState<'volunteer' | 'giving'>('volunteer')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newVolunteersNeeded, setNewVolunteersNeeded] = useState('')

  useEffect(() => { loadOpportunities() }, [])

  const loadOpportunities = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('love_actions')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      if (error) Alert.alert('Error', 'Failed to load opportunities')
      else setOpportunities(data || [])
    } catch { Alert.alert('Error', 'Failed to load opportunities') }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newDescription.trim() || !newCategory) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { navigation.navigate('Login'); return }

      const { error } = await supabase.from('love_actions').insert([{
        user_id: user.id, type: newType,
        title: newTitle.trim(), description: newDescription.trim(),
        category: newCategory, location: newLocation.trim() || null,
        volunteers_needed: newVolunteersNeeded ? parseInt(newVolunteersNeeded) : null,
        status: 'pending',
      }])

      if (error) { Alert.alert('Error', `Database error: ${error.message}`); return }

      setModalOpen(false)
      setNewTitle(''); setNewDescription(''); setNewCategory(''); setNewLocation(''); setNewVolunteersNeeded('')
      Alert.alert('Posted!', `Your ${newType === 'volunteer' ? 'volunteer opportunity' : 'giving item'} is pending approval. Admin has been notified!`)
    } catch { Alert.alert('Error', 'Failed to post opportunity. Please try again.') }
    finally { setSubmitting(false) }
  }

  const handleEmailContact = (title: string, type: string) => {
    const subject = encodeURIComponent(`Re: ${title} - ${type === 'volunteer' ? 'Volunteer Opportunity' : 'Item Available'}`)
    const body = encodeURIComponent(`Hi,\n\nI saw your post about "${title}" and I'm interested.\n\nBlessings,\n`)
    openMailto(`mailto:contact@gardenchurch.org?subject=${subject}&body=${body}`, 'contact@gardenchurch.org')
  }

  const formatDateTime = (dt: string) => new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const filtered = opportunities.filter(o => filter === 'all' || o.type === filter)
  const count = (f: FilterType) => f === 'all' ? opportunities.length : opportunities.filter(o => o.type === f).length

  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading opportunities...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
      <NavBar />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

        <Text style={styles.pageTitle}>Love in Action</Text>
        <Text style={styles.pageSubtitle}>Serve our community and share what matters. Together, we make a difference.</Text>

        <TouchableOpacity style={styles.postBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.postBtnText}>+ Post New Opportunity</Text>
        </TouchableOpacity>

        {/* Filters */}
        <View style={styles.filterRow}>
          {(['all', 'volunteer', 'giving'] as FilterType[]).map(f => (
            <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'volunteer' ? 'Volunteer' : 'Giving'} ({count(f)})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cards */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No opportunities found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or check back later.</Text>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setFilter('all')}>
              <Text style={styles.outlineBtnText}>Show All Opportunities</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(opp => (
            <View key={opp.id} style={styles.card}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, opp.type === 'volunteer' ? styles.badgeGreen : styles.badgeGold]}>
                  <Text style={[styles.badgeText, { color: opp.type === 'volunteer' ? GREEN : GOLD }]}>
                    {opp.type === 'volunteer' ? 'Volunteer' : 'Giving'}
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{opp.category}</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{opp.title}</Text>
              <Text style={styles.description}>{opp.description}</Text>

              {opp.type === 'volunteer' && (opp.location || opp.date_time || opp.volunteers_needed) && (
                <View style={styles.detailsBox}>
                  {opp.location && <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}><Icon name="location-outline" size={14} color="#6B7280" /><Text style={styles.detailText}> {opp.location}</Text></View>}
                  {opp.date_time && <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}><Icon name="calendar-outline" size={14} color="#6B7280" /><Text style={styles.detailText}> {formatDateTime(opp.date_time)}</Text></View>}
                  {opp.volunteers_needed && <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}><Icon name="people-outline" size={14} color="#6B7280" /><Text style={styles.detailText}> {opp.volunteers_needed} needed</Text></View>}
                </View>
              )}

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Church Member • {new Date(opp.created_at).toLocaleDateString()}</Text>
              </View>

              <TouchableOpacity style={styles.btn} onPress={() => handleEmailContact(opp.title, opp.type)}>
                <Icon name="mail-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>Get in Touch</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* How It Works */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Icon name="heart-outline" size={18} color="#fff" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoItemTitle}>Volunteer</Text>
              <Text style={styles.infoItemText}>Find meaningful ways to serve in our church and local community. Every skill and schedule matters.</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.infoIconBox, styles.infoIconBoxGold]}>
              <Icon name="gift-outline" size={18} color="#fff" />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoItemTitle, styles.infoItemTitleGold]}>Share & Give</Text>
              <Text style={styles.infoItemText}>Share items you no longer need with fellow members who could use them. It's recycling with love.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Post Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.modalContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share an Opportunity</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)}>
                  <Icon name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Post a volunteer need or item to share. Admin will be notified!</Text>

              <Text style={styles.label}>What are you sharing?</Text>
              <View style={styles.chipRow}>
                {(['volunteer', 'giving'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, newType === t && styles.chipActive]} onPress={() => { setNewType(t); setNewCategory('') }}>
                    <Text style={[styles.chipText, newType === t && styles.chipTextActive]}>{t === 'volunteer' ? 'Volunteer Opportunity' : 'Item to Give Away'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder={newType === 'volunteer' ? 'e.g., Help at Community Kitchen' : 'e.g., Dining Room Table'} />

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipRow}>
                {(newType === 'volunteer' ? VOLUNTEER_CATEGORIES : GIVING_CATEGORIES).map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, newCategory === c && styles.chipActive]} onPress={() => setNewCategory(c)}>
                    <Text style={[styles.chipText, newCategory === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.textarea]} value={newDescription} onChangeText={setNewDescription} placeholder={newType === 'volunteer' ? 'Describe what volunteers will do...' : 'Describe the item and its condition...'} multiline textAlignVertical="top" />

              {newType === 'volunteer' && (
                <>
                  <Text style={styles.label}>Location (Optional)</Text>
                  <TextInput style={styles.input} value={newLocation} onChangeText={setNewLocation} placeholder="Where will this take place?" />
                  <Text style={styles.label}>How many volunteers?</Text>
                  <TextInput style={styles.input} value={newVolunteersNeeded} onChangeText={setNewVolunteersNeeded} placeholder="Number needed" keyboardType="number-pad" />
                </>
              )}

              <TouchableOpacity style={[styles.btn, submitting && styles.btnDisabled]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Share This Opportunity</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

export default LoveActionScreen

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  container: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 8 },
  pageSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  postBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  filterBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  filterBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { fontSize: 12, color: '#374151' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeGreen: { backgroundColor: `${GREEN}1A`, borderColor: `${GREEN}33` },
  badgeGold: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  categoryBadge: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  categoryText: { fontSize: 11, color: '#374151' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 6 },
  description: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 10 },
  detailsBox: { backgroundColor: `${GREEN}1A`, borderRadius: 10, borderWidth: 1, borderColor: `${GREEN}33`, padding: 10, marginBottom: 10 },
  detailText: { fontSize: 13, color: GREEN, marginBottom: 4 },
  metaRow: { marginBottom: 10 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  btn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  outlineBtn: { borderWidth: 1, borderColor: `${GREEN}33`, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  outlineBtnText: { color: GREEN, fontSize: 13, fontWeight: '600' },
  infoSection: { backgroundColor: '#f0f7f2', borderRadius: 14, borderWidth: 1, borderColor: `${GREEN}33`, padding: 20, marginTop: 8 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: GREEN, textAlign: 'center', marginBottom: 16 },
  infoItem: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  infoIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  infoIconBoxGold: { backgroundColor: GOLD },
  infoText: { flex: 1 },
  infoItemTitle: { fontSize: 14, fontWeight: '600', color: GREEN, marginBottom: 4 },
  infoItemTitleGold: { color: GOLD },
  infoItemText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  modalContainer: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  modalClose: { fontSize: 20, color: '#6b7280', paddingHorizontal: 4 },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 16, backgroundColor: '#fff' },
  textarea: { minHeight: 100, paddingTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
})
