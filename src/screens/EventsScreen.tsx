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

const GREEN = '#1a4725'
const GOLD = '#9f7a49'

interface Event {
  id: string; title: string; date: string; time: string; location: string
  description: string; type: 'serve_community' | 'garden_hangouts'; status: 'published' | 'draft'; created_at: string
}

type FilterType = 'garden_hangouts' | 'serve_community'

function EventsScreen() {
  const navigation = useNavigation<any>()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('garden_hangouts')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single()
        setUserRole(p?.role || null)
      }
      const { data, error } = await supabase.from('events').select('*').eq('status', 'published').order('date', { ascending: true })
      if (error) Alert.alert('Error', 'Failed to load events')
      else setEvents(data || [])
    } catch { Alert.alert('Error', 'Failed to load page data') }
    finally { setLoading(false) }
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('events').delete().eq('id', id)
        if (error) Alert.alert('Error', 'Failed to delete event')
        else setEvents(prev => prev.filter(e => e.id !== id))
      }}
    ])
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const [year, month, day] = dateString.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch { return dateString }
  }

  const getTypeLabel = (type: string) => type === 'serve_community' ? 'Serve Our Community' : 'Garden Hangouts'
  const filteredEvents = events.filter(e => e.type === filter)

  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
      <NavBar />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Events</Text>
            <Text style={styles.pageSubtitle}>Join us for worship, fellowship, and growth opportunities.</Text>
          </View>
          {userRole === 'admin' && (
            <View style={styles.adminRow}>
              <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
              <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('NewEvent' as never)}>
                <Text style={styles.newBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          {(['garden_hangouts', 'serve_community'] as FilterType[]).map(f => (
            <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>{getTypeLabel(f)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Events */}
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptySubtitle}>Check back later for upcoming events.</Text>
            {userRole === 'admin' && (
              <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('NewEvent' as never)}>
                <Text style={styles.btnText}>Create First Event</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredEvents.map(event => (
            <View key={event.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, event.type === 'serve_community' ? styles.badgeGreen : styles.badgeGold]}>
                    <Text style={[styles.badgeText, { color: event.type === 'serve_community' ? GREEN : GOLD }]}>{getTypeLabel(event.type)}</Text>
                  </View>
                </View>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  {userRole === 'admin' && (
                    <View style={styles.actionBtns}>
                      <TouchableOpacity onPress={() => navigation.navigate('EditEvent' as never, { id: event.id } as never)}>
                        <Icon name="pencil-outline" size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(event.id)}>
                        <Icon name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <Icon name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}> {formatDate(event.date)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}> {event.time}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}> {event.location}</Text>
              </View>
              <Text style={styles.description}>{event.description}</Text>
              <View style={styles.detailRow}>
                <Icon name="person-outline" size={14} color="#9CA3AF" />
                <Text style={styles.metaText}> Church Admin</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default EventsScreen

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
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: GREEN },
  tabText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardHeader: { marginBottom: 12 },
  badgeRow: { flexDirection: 'row', marginBottom: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeGreen: { backgroundColor: `${GREEN}1A`, borderColor: `${GREEN}33` },
  badgeGold: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#000', flex: 1, marginRight: 8 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editIcon: { fontSize: 18 },
  deleteIcon: { fontSize: 18 },
  detailRow: { marginBottom: 6 },
  detailText: { fontSize: 14, color: '#374151' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22, marginVertical: 8 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
