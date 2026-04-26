import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Modal, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import NavBar from '../components/main-nav'
import Icon from '../components/Icon'

const GREEN = '#1a4725'

interface Prayer {
  id: string; title?: string; content?: string; is_anonymous?: boolean
  status: 'pending' | 'approved' | 'denied'; admin_notes?: string; created_at: string; user_id?: string
  itemType?: 'prayer'
  user_profiles?: { first_name?: string; last_name?: string; email?: string }
}

interface LoveAction {
  id: string; title: string; description: string; type: 'volunteer' | 'giving'
  category: string; location?: string | null; date_time?: string | null; volunteers_needed?: number | null
  status: 'pending' | 'approved' | 'denied'; admin_notes?: string | null; created_at: string; user_id?: string
  itemType?: 'love-action'
}

type AdminItem = (Prayer & { itemType: 'prayer' }) | (LoveAction & { itemType: 'love-action' })

type StatusFilter = 'pending' | 'approved' | 'denied' | 'all'
type TypeFilter = 'all' | 'prayers' | 'love-actions'

export default function AdminScreen() {
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [loveActions, setLoveActions] = useState<LoveAction[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminItem | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => { loadAllData() }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const { data: prayerData } = await supabase.from('prayer_requests').select('*').order('created_at', { ascending: false })
      const userIds = [...new Set((prayerData || []).map((p: any) => p.user_id).filter(Boolean))]
      const profileMap: Record<string, any> = {}
      if (userIds.length > 0) {
        const { data: profileData } = await supabase.from('user_profiles').select('user_id, first_name, last_name, email').in('user_id', userIds)
        for (const p of profileData || []) profileMap[p.user_id] = p
      }
      const formattedPrayers: Prayer[] = (prayerData || []).map((p: any) => ({ ...p, itemType: 'prayer' as const, user_profiles: p.user_id ? profileMap[p.user_id] : undefined }))
      setPrayers(formattedPrayers)

      const { data: laData } = await supabase.from('love_actions').select('*').order('created_at', { ascending: false })
      setLoveActions((laData || []).map((la: any) => ({ ...la, itemType: 'love-action' as const })))
    } finally { setLoading(false) }
  }

  const handleStatus = async (item: AdminItem, status: 'approved' | 'denied', notes?: string) => {
    setProcessingId(item.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const table = item.itemType === 'prayer' ? 'prayer_requests' : 'love_actions'
      await supabase.from(table).update({ status, admin_notes: notes || null, approved_by: user?.id }).eq('id', item.id)

      if (item.itemType === 'prayer') setPrayers(prev => prev.map(p => p.id === item.id ? { ...p, status, admin_notes: notes } : p))
      else setLoveActions(prev => prev.map(la => la.id === item.id ? { ...la, status, admin_notes: notes } : la))
      setSelected(null); setAdminNotes('')
    } finally { setProcessingId(null) }
  }

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setExpandedIds(next)
  }

  const getTitle = (item: AdminItem) => item.itemType === 'prayer' ? ((item as Prayer).title || 'Prayer Request') : (item as LoveAction).title
  const getContent = (item: AdminItem) => item.itemType === 'prayer' ? ((item as Prayer).content || '') : (item as LoveAction).description
  const getDisplayName = (item: AdminItem) => {
    if (item.itemType !== 'prayer') return 'Church Member'
    if ((item as Prayer).is_anonymous) return 'Anonymous'
    const p = item as Prayer
    const name = `${p.user_profiles?.first_name || ''} ${p.user_profiles?.last_name || ''}`.trim()
    return name || 'Church Member'
  }

  const getAllItems = (): AdminItem[] => {
    let items: AdminItem[] = [
      ...prayers.map(p => ({ ...p, itemType: 'prayer' as const })),
      ...loveActions.map(la => ({ ...la, itemType: 'love-action' as const })),
    ]
    if (statusFilter !== 'all') items = items.filter(i => i.status === statusFilter)
    if (typeFilter === 'prayers') items = items.filter(i => i.itemType === 'prayer')
    else if (typeFilter === 'love-actions') items = items.filter(i => i.itemType === 'love-action')
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const pendingCount = prayers.filter(p => p.status === 'pending').length + loveActions.filter(la => la.status === 'pending').length
  const approvedCount = prayers.filter(p => p.status === 'approved').length + loveActions.filter(la => la.status === 'approved').length

  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading admin data...</Text>
      </SafeAreaView>
    )
  }

  const items = getAllItems()

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
      <NavBar />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

        <Text style={styles.pageTitle}>Admin Review</Text>

        {/* Stat Pills */}
        <View style={styles.statRow}>
          {[
            { label: 'Pending', value: pendingCount, color: '#fef3c7', text: '#92400e' },
            { label: 'Approved', value: approvedCount, color: '#dcfce7', text: '#166534' },
            { label: 'Prayers', value: prayers.length, color: '#f3e8ff', text: '#6b21a8' },
            { label: 'Love Actions', value: loveActions.length, color: '#dbeafe', text: '#1e40af' },
          ].map(s => (
            <View key={s.label} style={[styles.statPill, { backgroundColor: s.color }]}>
              <Text style={[styles.statLabel, { color: s.text }]}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.text }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Status Filter */}
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filterRow}>
          {(['all', 'pending', 'approved', 'denied'] as StatusFilter[]).map(s => (
            <TouchableOpacity key={s} style={[styles.filterBtn, statusFilter === s && styles.filterBtnActive]} onPress={() => setStatusFilter(s)}>
              <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type Filter */}
        <Text style={styles.filterLabel}>Type</Text>
        <View style={styles.filterRow}>
          {(['all', 'prayers', 'love-actions'] as TypeFilter[]).map(t => (
            <TouchableOpacity key={t} style={[styles.filterBtn, typeFilter === t && styles.filterBtnActive]} onPress={() => setTypeFilter(t)}>
              <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>{t === 'all' ? 'All' : t === 'prayers' ? 'Prayers' : 'Love Actions'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.resultMeta}>Showing {items.length} items</Text>

        {/* Items */}
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters to see more results.</Text>
          </View>
        ) : (
          items.map(item => {
            const content = getContent(item)
            const isExpanded = expandedIds.has(item.id)
            const needsTrunc = content.length > 160
            const shown = isExpanded || !needsTrunc ? content : content.slice(0, 160) + '…'

            return (
              <View key={`${item.itemType}-${item.id}`} style={styles.card}>
                {/* Type Badge */}
                <View style={styles.cardBadgeRow}>
                  <View style={[styles.typeBadge, item.itemType === 'prayer' ? styles.typePrayer : (item as LoveAction).type === 'volunteer' ? styles.typeVolunteer : styles.typeGiving]}>
                    <Text style={styles.typeBadgeText}>
                      {item.itemType === 'prayer' ? 'Prayer' : (item as LoveAction).type === 'volunteer' ? 'Volunteer' : 'Giving'}
                    </Text>
                  </View>
                  <View style={[styles.statusIndicator, item.status === 'pending' ? styles.statusPending : item.status === 'approved' ? styles.statusApproved : styles.statusDenied]}>
                    <Text style={styles.statusIndicatorText}>{item.status}</Text>
                  </View>
                </View>

                <Text style={styles.itemTitle}>{getTitle(item)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="person-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.itemMeta}>{getDisplayName(item)}</Text>
                  <Text style={styles.itemMeta}> · </Text>
                  <Icon name="calendar-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.itemMeta}> {new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                {item.itemType === 'love-action' && (item as LoveAction).category && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="folder-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.itemMeta}>{(item as LoveAction).category}</Text>
                  </View>
                )}

                <Text style={styles.itemContent}>{shown}</Text>
                {needsTrunc && (
                  <TouchableOpacity onPress={() => toggleExpand(item.id)}>
                    <Text style={styles.expandLink}>{isExpanded ? 'Show less ▲' : 'Read more ▼'}</Text>
                  </TouchableOpacity>
                )}

                {item.admin_notes && (
                  <View style={styles.adminNotesBox}>
                    <Text style={styles.adminNotesText}><Text style={{ fontWeight: '700' }}>Admin Notes:</Text> {item.admin_notes}</Text>
                  </View>
                )}

                {item.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.reviewBtn} onPress={() => setSelected(item)}>
                      <Icon name="eye-outline" size={14} color="#374151" style={{ marginRight: 4 }} />
                      <Text style={styles.reviewBtnText}>Review</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleStatus(item, 'approved')} disabled={processingId === item.id}>
                      <Text style={styles.approveBtnText}>{processingId === item.id ? '...' : '✓ Approve'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.denyBtn} onPress={() => handleStatus(item, 'denied', 'Denied without specific reason')} disabled={processingId === item.id}>
                      {processingId !== item.id && <Icon name="close-outline" size={15} color="#fff" style={{ marginRight: 4 }} />}
                      <Text style={styles.denyBtnText}>{processingId === item.id ? '...' : 'Deny'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setSelected(null); setAdminNotes('') }}>
        {selected && (
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Review {selected.itemType === 'prayer' ? 'Prayer Request' : 'Love Action'}</Text>
                <TouchableOpacity onPress={() => { setSelected(null); setAdminNotes('') }}>
                  <Icon name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Add notes and approve or deny this item.</Text>

              <Text style={styles.modalItemTitle}>{getTitle(selected)}</Text>
              <Text style={styles.modalItemContent}>{getContent(selected)}</Text>

              {selected.itemType === 'love-action' && (
                <View style={styles.modalDetails}>
                  <Text style={styles.modalDetailText}><Text style={{ fontWeight: '700' }}>Category:</Text> {(selected as LoveAction).category}</Text>
                  {(selected as LoveAction).location && <Text style={styles.modalDetailText}><Text style={{ fontWeight: '700' }}>Location:</Text> {(selected as LoveAction).location}</Text>}
                  {(selected as LoveAction).volunteers_needed && <Text style={styles.modalDetailText}><Text style={{ fontWeight: '700' }}>Volunteers Needed:</Text> {(selected as LoveAction).volunteers_needed}</Text>}
                </View>
              )}

              <Text style={styles.label}>Admin Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder="Add any notes about this decision..."
                multiline textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleStatus(selected, 'approved', adminNotes)} disabled={processingId === selected.id}>
                  <Text style={styles.approveBtnText}>{processingId === selected.id ? '...' : '✓ Approve'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.denyBtn} onPress={() => handleStatus(selected, 'denied', adminNotes || 'Request denied')} disabled={processingId === selected.id}>
                  {processingId !== selected.id && <Icon name="close-outline" size={15} color="#fff" style={{ marginRight: 4 }} />}
                  <Text style={styles.denyBtnText}>{processingId === selected.id ? '...' : 'Deny'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelActionBtn} onPress={() => { setSelected(null); setAdminNotes('') }}>
                  <Text style={styles.cancelActionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  container: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 16 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statPill: { flex: 1, minWidth: 80, borderRadius: 12, padding: 10, alignItems: 'flex-start' },
  statLabel: { fontSize: 10, fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  filterBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { fontSize: 13, color: '#374151' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  resultMeta: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  typePrayer: { backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' },
  typeVolunteer: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  typeGiving: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  statusIndicator: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusPending: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  statusApproved: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  statusDenied: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusIndicatorText: { fontSize: 10, fontWeight: '600', color: '#374151' },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 },
  itemMeta: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  itemContent: { fontSize: 13, color: '#374151', lineHeight: 20, marginTop: 8, marginBottom: 4 },
  expandLink: { color: '#059669', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  adminNotesBox: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, padding: 10, marginTop: 8 },
  adminNotesText: { fontSize: 12, color: '#1e40af' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reviewBtn: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  reviewBtnText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  approveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  approveBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  denyBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  denyBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  emptyCard: { borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  modalContainer: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  modalClose: { fontSize: 20, color: '#6b7280', paddingHorizontal: 4 },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  modalItemTitle: { fontSize: 17, fontWeight: '700', color: '#000', marginBottom: 8 },
  modalItemContent: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 12 },
  modalDetails: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 16 },
  modalDetailText: { fontSize: 13, color: '#374151', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 16, backgroundColor: '#fff' },
  textarea: { minHeight: 100, paddingTop: 12 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelActionBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelActionText: { fontSize: 13, color: '#374151', fontWeight: '600' },
})
