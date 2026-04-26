import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import NavBar from '../components/main-nav'
import Icon from '../components/Icon'
import { openMailto } from '../lib/openMailto'

const GREEN = '#1a4725'

interface Announcement {
  id: string
  title: string
  content: string
  contact_email?: string
  type: 'service' | 'event' | 'group' | 'update' | 'opportunity' | 'general'
  status: 'published' | 'draft'
  created_at: string
  user_profiles?: { first_name?: string; last_name?: string; email?: string }
}

function AnnouncementsScreen() {
  const navigation = useNavigation<any>()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('user_profiles').select('role').eq('user_id', user.id).single()
        setUserRole(profileData?.role || null)
      }

      const { data, error } = await supabase
        .from('announcements')
        .select('*, user_profiles(first_name, last_name, email)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (error) Alert.alert('Error', 'Failed to load announcements')
      else setAnnouncements(data || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load page data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Announcement', 'Are you sure you want to delete this announcement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('announcements').delete().eq('id', id)
          if (error) Alert.alert('Error', 'Failed to delete announcement')
          else setAnnouncements(prev => prev.filter(a => a.id !== id))
        }
      }
    ])
  }

  const getTypeBadgeStyle = (type: string) => {
    const map: Record<string, object> = {
      service: styles.badgeGreen, event: styles.badgeGold, group: styles.badgePurple,
      update: styles.badgeAmber, opportunity: styles.badgeOrange, general: styles.badgeGray,
    }
    return map[type] || styles.badgeGray
  }

  const getAuthorName = (a: Announcement) => {
    if (a.user_profiles) {
      const { first_name, last_name } = a.user_profiles
      if (first_name && last_name) return `${first_name} ${last_name}`
      if (first_name) return first_name
    }
    return 'Church Admin'
  }

  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading announcements...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
      <NavBar />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Announcements</Text>
            <Text style={styles.pageSubtitle}>Stay updated with the latest news from Our Garden.</Text>
          </View>
          {userRole === 'admin' && (
            <View style={styles.adminRow}>
              <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
              <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('NewAnnouncement' as never)}>
                <Text style={styles.newBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Announcements */}
        {announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for updates from our church community.</Text>
            {userRole === 'admin' && (
              <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('NewAnnouncement' as never)}>
                <Text style={styles.btnText}>Create First Announcement</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          announcements.map(a => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, getTypeBadgeStyle(a.type)]}>
                    <Text style={styles.badgeText}>{a.type}</Text>
                  </View>
                </View>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{a.title}</Text>
                  {userRole === 'admin' && (
                    <View style={styles.actionBtns}>
                      <TouchableOpacity onPress={() => navigation.navigate('EditAnnouncement' as never, { id: a.id } as never)}>
                        <Icon name="pencil-outline" size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(a.id)}>
                        <Icon name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.content}>{a.content}</Text>

              {a.contact_email && (
                <View style={styles.contactBox}>
                  <Icon name="mail-outline" size={14} color="#6B7280" />
                  <Text style={styles.contactLabel}> Contact: </Text>
                  <TouchableOpacity onPress={() => openMailto(`mailto:${a.contact_email}`, a.contact_email)}>
                    <Text style={styles.contactLink}>{a.contact_email}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.metaRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="person-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.metaText}>{getAuthorName(a)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="calendar-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.metaText}>{new Date(a.created_at).toLocaleDateString()}</Text>
                </View>
              </View>

              {a.contact_email && (
                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => openMailto(`mailto:${a.contact_email}`, a.contact_email)}
                >
                  <Icon name="mail-outline" size={15} color="#1a4725" />
                  <Text style={styles.outlineBtnText}> Contact</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default AnnouncementsScreen

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
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardHeader: { marginBottom: 12 },
  badgeRow: { flexDirection: 'row', marginBottom: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeGreen: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  badgeGold: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  badgePurple: { backgroundColor: '#f3e8ff', borderColor: '#c4b5fd' },
  badgeAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  badgeOrange: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  badgeGray: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#000', flex: 1, marginRight: 8 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editIcon: { fontSize: 18 },
  deleteIcon: { fontSize: 18 },
  content: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 12 },
  contactBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: GREEN, padding: 10, marginBottom: 12 },
  contactLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  contactLink: { fontSize: 13, color: GREEN, textDecorationLine: 'underline' },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  outlineBtn: { borderWidth: 1, borderColor: GREEN, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  outlineBtnText: { color: GREEN, fontSize: 13, fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
