import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

import NavBar from '../components/main-nav'
import Icon from '../components/Icon'
import { openMailto } from '../lib/openMailto'

const GREEN = '#1a4725'

interface CellGroup {
  id: string; name: string; status: 'open' | 'full'; meeting_day: string; meeting_time: string; email: string; created_at: string
}

type FilterType = 'all' | 'open' | 'full'

function CellGroupsScreen() {
  const navigation = useNavigation<any>()
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([])
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
      const { data, error } = await supabase.from('cell_groups').select('*').order('name', { ascending: true })
      if (error) Alert.alert('Error', 'Failed to load cell groups')
      else setCellGroups(data || [])
    } catch { Alert.alert('Error', 'Failed to load page data') }
    finally { setLoading(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Cell Group', 'Are you sure you want to delete this cell group?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('cell_groups').delete().eq('id', id)
        if (error) Alert.alert('Error', 'Failed to delete cell group')
        else setCellGroups(prev => prev.filter(g => g.id !== id))
      }}
    ])
  }

  const handleEmailContact = (email: string, name: string) => {
    const subject = encodeURIComponent(`Interest in Joining ${name} Cell Group`)
    const body = encodeURIComponent(`Hi,\n\nI saw your cell group "${name}" and I'm interested in joining.\n\nBlessings,\n`)
    openMailto(`mailto:${email}?subject=${subject}&body=${body}`, email)
  }

  const filtered = filter === 'all' ? cellGroups : cellGroups.filter(g => g.status === filter)
  const count = (f: FilterType) => f === 'all' ? cellGroups.length : cellGroups.filter(g => g.status === f).length

  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading cell groups...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
      <NavBar />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Cell Groups</Text>
            <Text style={styles.pageSubtitle}>Connect in smaller communities for deeper fellowship and spiritual growth.</Text>
          </View>
          {userRole === 'admin' && (
            <View style={styles.adminRow}>
              <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
              <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('NewCellGroup' as never)}>
                <Text style={styles.newBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {(['all', 'open', 'full'] as FilterType[]).map(f => (
            <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({count(f)})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Groups */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No cell groups yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for new groups to join.</Text>
            {userRole === 'admin' && (
              <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('NewCellGroup' as never)}>
                <Text style={styles.btnText}>Create First Group</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map(group => (
            <View key={group.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}><Text style={styles.badgeText}>📖 Cell Group</Text></View>
                  <View style={[styles.statusBadge, group.status === 'full' ? styles.statusFull : styles.statusOpen]}>
                    <Text style={styles.statusText}>{group.status === 'full' ? 'Full' : 'Open'}</Text>
                  </View>
                </View>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{group.name}</Text>
                  {userRole === 'admin' && (
                    <View style={styles.actionBtns}>
                      <TouchableOpacity onPress={() => navigation.navigate('EditCellGroup' as never, { id: group.id } as never)}>
                        <Icon name="pencil-outline" size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(group.id)}>
                        <Icon name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <Icon name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}> {group.meeting_day}s</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}> {group.meeting_time}</Text>
              </View>
              <TouchableOpacity style={styles.detailRow} onPress={() => openMailto(`mailto:${group.email}`, group.email)}>
                <Icon name="mail-outline" size={14} color="#6B7280" />
                <Text style={styles.emailLink}> {group.email}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, group.status === 'full' && styles.btnDisabled]}
                onPress={() => handleEmailContact(group.email, group.name)}
                disabled={group.status === 'full'}
              >
                {group.status !== 'full' && <Icon name="mail-outline" size={15} color="#fff" style={{ marginRight: 6 }} />}
                <Text style={styles.btnText}>{group.status === 'full' ? 'Group Full' : 'Join Group'}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Why Join a Cell Group?</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoItemTitle}>Deeper Study</Text>
            <Text style={styles.infoItemText}>Dive deeper into God's Word with focused Bible study in a smaller setting.</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoItemTitle}>Authentic Community</Text>
            <Text style={styles.infoItemText}>Build meaningful relationships and experience genuine fellowship with fellow believers.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default CellGroupsScreen

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
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  filterBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { fontSize: 13, color: '#374151' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardHeader: { marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { backgroundColor: `${GREEN}1A`, borderWidth: 1, borderColor: `${GREEN}33`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: GREEN },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusOpen: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  statusFull: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#000', flex: 1, marginRight: 8 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editIcon: { fontSize: 18 },
  deleteIcon: { fontSize: 18 },
  detailRow: { marginBottom: 6 },
  detailText: { fontSize: 14, color: '#374151' },
  emailLink: { fontSize: 14, color: GREEN, textDecorationLine: 'underline', marginBottom: 12 },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  infoSection: { backgroundColor: '#f0f7f2', borderRadius: 12, borderWidth: 1, borderColor: `${GREEN}33`, padding: 20, marginTop: 16 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: GREEN, textAlign: 'center', marginBottom: 16 },
  infoItem: { marginBottom: 12 },
  infoItemTitle: { fontSize: 14, fontWeight: '600', color: GREEN, marginBottom: 4 },
  infoItemText: { fontSize: 13, color: '#374151', lineHeight: 20 },
})
