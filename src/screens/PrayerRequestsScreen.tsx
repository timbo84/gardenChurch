import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import NavBar from '../components/main-nav'
import LinearGradient from 'react-native-linear-gradient'
import { openMailto } from '../lib/openMailto'

const GREEN = '#1a4725'

interface PrayerRequest {
  id: string; title: string; content: string; is_anonymous: boolean
  status: 'pending' | 'approved' | 'denied'; created_at: string; user_id?: string
  user_profiles?: { first_name?: string; last_name?: string; email?: string }
}

interface UserProfile { first_name?: string; last_name?: string; email?: string }

const getDisplayName = (profile: UserProfile | undefined): string => {
  if (profile?.first_name || profile?.last_name) return `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
  if (profile?.email) return profile.email.split('@')[0]
  return 'Church Member'
}

type TabType = 'submit' | 'view'

function PrayerRequestsScreen() {
  const navigation = useNavigation<any>()
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('view')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => { initUser() }, [])

  const initUser = async () => {
    try {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUserId(data.user.id)
        setUserEmail(data.user.email || null)
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('user_id', data.user.id).single()
        setUserRole(profile?.role || null)
      }
    } catch (err) { console.error('Error getting user:', err) }
  }

  const loadPrayerRequests = useCallback(async () => {
    try {
      let query = supabase
        .from('prayer_requests')
        .select('id, title, content, is_anonymous, status, created_at, user_id')
        .order('created_at', { ascending: false })
      if (userRole !== 'admin') query = query.eq('status', 'approved')
      const { data, error } = await query
      if (error) { console.error('Prayer requests query error:', error); return }
      if (!data || data.length === 0) { setPrayerRequests([]); return }

      const withProfiles: PrayerRequest[] = await Promise.all(
        data.map(async (req) => {
          let profile: UserProfile | undefined
          try {
            const { data: p } = await supabase.from('user_profiles').select('first_name, last_name, email').eq('user_id', req.user_id).single()
            profile = p || undefined
          } catch {}
          return { ...req, status: req.status as 'pending' | 'approved' | 'denied', user_profiles: profile }
        })
      )
      setPrayerRequests(withProfiles)
    } catch (err) { console.error('Exception loading prayers:', err) }
  }, [userId, userRole])

  useEffect(() => {
    loadPrayerRequests()
  }, [loadPrayerRequests])

  const handleSubmitPrayer = async () => {
    if (!content.trim() || !title.trim()) { Alert.alert('Error', 'Please fill in the title and details.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('prayer_requests').insert([{
        user_id: userId, title: title.trim(), content: content.trim(),
        is_anonymous: false, status: 'pending',
      }])
      if (error) { Alert.alert('Error', 'Failed to submit prayer request'); return }

      setTitle(''); setContent('')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
      if (userRole === 'admin') loadPrayerRequests()
    } catch { Alert.alert('Error', 'Error submitting prayer request') }
    finally { setLoading(false) }
  }

  // Group prayers by user
  const grouped = prayerRequests.reduce((acc, prayer) => {
    const key = prayer.user_id || 'anonymous'
    if (!acc[key]) acc[key] = { profile: prayer.user_profiles, prayers: [] }
    acc[key].prayers.push(prayer)
    return acc
  }, {} as Record<string, { profile: UserProfile | undefined; prayers: PrayerRequest[] }>)

  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const aLatest = Math.max(...a.prayers.map(p => new Date(p.created_at).getTime()))
    const bLatest = Math.max(...b.prayers.map(p => new Date(p.created_at).getTime()))
    return bLatest - aLatest
  })


  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.flex}>
      <NavBar />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

          {/* Banner */}
          <View style={styles.banner}>
            <LinearGradient
              colors={['#CBAF8B', '#A07C54']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.bannerTitle}>Prayer Requests</Text>
            <Text style={styles.bannerSubtitle}>James 5:16</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tab, activeTab === 'submit' && styles.tabActive]} onPress={() => setActiveTab('submit')}>
              <Text style={[styles.tabText, activeTab === 'submit' && styles.tabTextActive]}>Submit a Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'view' && styles.tabActive]} onPress={() => setActiveTab('view')}>
              <Text style={[styles.tabText, activeTab === 'view' && styles.tabTextActive]}>Prayer Wall ({prayerRequests.length})</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Tab */}
          {activeTab === 'submit' && !userId && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign In to Submit</Text>
              <Text style={styles.infoText}>You need to be signed in to submit a prayer request.</Text>
              <TouchableOpacity style={[styles.btn, { marginTop: 16 }]} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.btnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'submit' && !!userId && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Share Your Prayer Request</Text>

              {submitSuccess && (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>✅ Prayer request submitted successfully! It will be reviewed before being shared with the community.</Text>
                </View>
              )}

              <Text style={styles.label}>Prayer Request Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Healing for my family member" maxLength={100} />
              <Text style={styles.charCount}>{title.length}/100 characters</Text>

              <Text style={styles.label}>Prayer Request Details *</Text>
              <TextInput style={[styles.input, styles.textarea]} value={content} onChangeText={setContent} placeholder="Please share the details of your prayer request..." multiline textAlignVertical="top" maxLength={10000} />
              <Text style={styles.charCount}>{content.length}/10000 characters</Text>

              <View style={styles.noteBox}>
                <Text style={styles.noteText}><Text style={{ fontWeight: '700' }}>Please note:</Text> All prayer requests are reviewed by our prayer team before being shared. This helps ensure appropriate content and provides an opportunity for pastoral care if needed.</Text>
              </View>

              <TouchableOpacity
                style={[styles.btn, (loading || !content.trim() || !title.trim()) && styles.btnDisabled]}
                onPress={handleSubmitPrayer}
                disabled={loading || !content.trim() || !title.trim()}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Prayer Request</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* View Tab */}
          {activeTab === 'view' && (
            <View>
              {sortedGroups.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    {userRole === 'admin' ? 'No prayer requests found.' : 'No approved prayer requests at this time.'}
                  </Text>
                </View>
              ) : (
                sortedGroups.map(([userId, group]) => {
                  const sorted = [...group.prayers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  const latest = sorted[0]
                  const older = sorted.slice(1)
                  const isExpanded = expandedIds.has(userId)
                  const isOwn = group.profile?.email === userEmail

                  return (
                    <View key={userId} style={styles.card}>
                      <View style={styles.groupHeader}>
                        <View>
                          <Text style={styles.groupName}>{getDisplayName(group.profile)}</Text>
                          {isOwn && <View style={styles.ownBadge}><Text style={styles.ownBadgeText}>Your Prayers</Text></View>}
                          <Text style={styles.groupMeta}>{group.prayers.length} prayer request{group.prayers.length !== 1 ? 's' : ''}</Text>
                        </View>
                        {older.length > 0 && (
                          <TouchableOpacity onPress={() => {
                            const next = new Set(expandedIds)
                            if (next.has(userId)) next.delete(userId); else next.add(userId)
                            setExpandedIds(next)
                          }}>
                            <Text style={styles.expandBtn}>{isExpanded ? '▲ Hide' : `▼ View All ${group.prayers.length}`}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Latest Prayer */}
                      <View style={styles.prayerBox}>
                        <View style={styles.prayerHeader}>
                          <Text style={styles.prayerTitle}>{latest.title}</Text>
                          {userRole === 'admin' && (
                            <View style={[styles.statusBadge, latest.status === 'approved' ? styles.statusApproved : latest.status === 'denied' ? styles.statusDenied : styles.statusPending]}>
                              <Text style={styles.statusText}>{latest.status}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.prayerDate}>{new Date(latest.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                        <Text style={styles.prayerContent}>{latest.content}</Text>
                        {latest.user_profiles?.email && (
                          <TouchableOpacity onPress={() => openMailto(`mailto:${latest.user_profiles!.email}`, latest.user_profiles!.email)}>
                            <Text style={styles.emailLink}>Contact: {latest.user_profiles.email}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Older Prayers */}
                      {isExpanded && older.map(prayer => (
                        <View key={prayer.id} style={[styles.prayerBox, { marginLeft: 16 }]}>
                          <View style={styles.prayerHeader}>
                            <Text style={styles.prayerTitle}>{prayer.title}</Text>
                            {userRole === 'admin' && (
                              <View style={[styles.statusBadge, prayer.status === 'approved' ? styles.statusApproved : prayer.status === 'denied' ? styles.statusDenied : styles.statusPending]}>
                                <Text style={styles.statusText}>{prayer.status}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.prayerDate}>{new Date(prayer.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                          <Text style={styles.prayerContent}>{prayer.content}</Text>
                        </View>
                      ))}
                    </View>
                  )
                })
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default PrayerRequestsScreen

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  centered: { paddingVertical: 40, alignItems: 'center' },
  container: { padding: 16, paddingBottom: 40 },
  banner: { borderRadius: 16, overflow: 'hidden', padding: 24, marginBottom: 16, alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: 0.5 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4, fontStyle: 'italic' },
  infoText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: GREEN },
  tabText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 8, backgroundColor: '#fff' },
  textarea: { minHeight: 120, paddingTop: 12 },
  charCount: { fontSize: 11, color: '#9ca3af', marginBottom: 16, textAlign: 'right' },
  noteBox: { backgroundColor: `${GREEN}1A`, borderWidth: 1, borderColor: `${GREEN}33`, borderRadius: 10, padding: 14, marginBottom: 16 },
  noteText: { fontSize: 13, color: GREEN, lineHeight: 20 },
  successBox: { backgroundColor: `${GREEN}1A`, borderWidth: 1, borderColor: `${GREEN}33`, borderRadius: 10, padding: 14, marginBottom: 16 },
  successText: { fontSize: 13, color: GREEN, lineHeight: 20 },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  groupName: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 4 },
  ownBadge: { backgroundColor: `${GREEN}1A`, borderWidth: 1, borderColor: `${GREEN}33`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 4 },
  ownBadgeText: { fontSize: 11, color: GREEN, fontWeight: '600' },
  groupMeta: { fontSize: 13, color: '#9ca3af' },
  expandBtn: { color: GREEN, fontSize: 13, fontWeight: '600' },
  prayerBox: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 10 },
  prayerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  prayerTitle: { fontSize: 16, fontWeight: '700', color: '#000', flex: 1, marginRight: 8 },
  prayerDate: { fontSize: 11, color: '#9ca3af', marginBottom: 8 },
  prayerContent: { fontSize: 14, color: '#374151', lineHeight: 22 },
  emailLink: { fontSize: 13, color: GREEN, textDecorationLine: 'underline', marginTop: 8 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusApproved: { backgroundColor: `${GREEN}1A`, borderColor: `${GREEN}33` },
  statusDenied: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusPending: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  statusText: { fontSize: 10, fontWeight: '600', color: '#374151' },
})
