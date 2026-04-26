import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, Linking, StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

import NavBar from '../components/main-nav'
import Icon from '../components/Icon'
import { openMailto } from '../lib/openMailto'

const GREEN = '#1a4725'

interface VolunteerOpportunity {
  id: string; title: string; description: string; commitment: string; contact: string
  contact_email: string; signup_link?: string | null
  category: 'helps' | 'next_gen' | 'hospitality' | 'providence'; status: 'published' | 'draft'; created_at: string
}

type FilterType = 'all' | 'helps' | 'next_gen' | 'hospitality' | 'providence'

function VolunteerScreen() {
  const navigation = useNavigation<any>()
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single()
        setUserRole(p?.role || null)
      }
      const { data, error } = await supabase.from('volunteer_opportunities').select('*').eq('status', 'published').order('created_at', { ascending: false })
      if (error) Alert.alert('Error', `Failed to load volunteer opportunities: ${error.message}`)
      else setOpportunities(data || [])
    } catch { Alert.alert('Error', 'Failed to load page data') }
    finally { setLoading(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to delete this volunteer opportunity?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('volunteer_opportunities').delete().eq('id', id)
        if (error) Alert.alert('Error', 'Failed to delete volunteer opportunity')
        else setOpportunities(prev => prev.filter(o => o.id !== id))
      }}
    ])
  }

  const getCategoryLabel = (category: string) => ({ helps: 'Helps', next_gen: 'Next Gen', hospitality: 'Hospitality', providence: 'Providence' }[category] || category)
  const filtered = filter === 'all' ? opportunities : opportunities.filter(o => o.category === filter)

  const FILTERS: FilterType[] = ['all', 'helps', 'next_gen', 'hospitality', 'providence']
  const getFilterLabel = (f: FilterType) => f === 'all' ? 'All' : getCategoryLabel(f)

  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading volunteer opportunities...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
      <NavBar />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Volunteer Opportunities</Text>
            <Text style={styles.pageSubtitle}>Find ways to serve and make a difference in our church and community.</Text>
          </View>
          {userRole === 'admin' && (
            <View style={styles.adminRow}>
              <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
              <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('NewVolunteer' as never)}>
                <Text style={styles.newBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{getFilterLabel(f)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Opportunities */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No volunteer opportunities yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for ways to serve.</Text>
            {userRole === 'admin' && (
              <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('NewVolunteer' as never)}>
                <Text style={styles.btnText}>Create First Opportunity</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map(opp => (
            <View key={opp.id} style={styles.card}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}><Text style={styles.badgeText}>{getCategoryLabel(opp.category)}</Text></View>
              </View>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{opp.title}</Text>
                {userRole === 'admin' && (
                  <View style={styles.actionBtns}>
                    <TouchableOpacity onPress={() => navigation.navigate('EditVolunteer' as never, { id: opp.id } as never)}>
                        <Icon name="pencil-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(opp.id)}>
                        <Icon name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={styles.description}>{opp.description}</Text>

              <View style={styles.detailRow}>
                <Icon name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}> <Text style={styles.detailLabel}>Time Commitment: </Text>{opp.commitment}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="person-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}> <Text style={styles.detailLabel}>Contact: </Text>{opp.contact}</Text>
              </View>
              <TouchableOpacity style={styles.detailRow} onPress={() => openMailto(`mailto:${opp.contact_email}`, opp.contact_email)}>
                <Icon name="mail-outline" size={14} color="#6B7280" />
                <Text style={styles.emailLink}> {opp.contact_email}</Text>
              </TouchableOpacity>

              {opp.signup_link ? (
                <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(opp.signup_link!)}>
                  <Icon name="link-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnText}>Sign Up</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.btn} onPress={() => openMailto(`mailto:${opp.contact_email}?subject=Volunteer Opportunity: ${opp.title}`, opp.contact_email)}>
                  <Icon name="mail-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnText}>Contact to Join</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default VolunteerScreen

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#000', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#6b7280' },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminBadge: { backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  adminBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  newBtn: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filterScroll: { marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  filterBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  filterBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { fontSize: 13, color: '#374151' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  badgeRow: { flexDirection: 'row', marginBottom: 8 },
  badge: { backgroundColor: `${GREEN}1A`, borderWidth: 1, borderColor: `${GREEN}33`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: GREEN },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#000', flex: 1, marginRight: 8 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editIcon: { fontSize: 18 },
  deleteIcon: { fontSize: 18 },
  description: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailText: { fontSize: 13, color: '#374151' },
  detailLabel: { fontWeight: '600', color: '#000' },
  emailLink: { fontSize: 13, color: GREEN, textDecorationLine: 'underline', marginBottom: 12 },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
})
