import React, { useState, useEffect } from 'react'
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
  Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

const GREEN = '#1a4725'
const GOLD = '#9f7a49'

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidSession(!!session)
      setChecking(false)
      if (!session) {
        Alert.alert(
          'Link Expired',
          'Invalid or expired reset link. Please request a new password reset.',
          [{ text: 'OK', onPress: () => navigation.navigate('ForgotPassword' as never) }]
        )
      }
    }
    checkSession()
  }, [navigation])

  const handlePasswordUpdate = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match. Please try again.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      await supabase.auth.signOut()
      Alert.alert(
        'Success',
        'Password updated successfully! Please sign in with your new password.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.checkingText}>Validating reset link...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.flex}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.logoContainer}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>Our Garden</Text>
        </View>

        {isValidSession && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Set New Password</Text>
            <Text style={styles.cardSubtitle}>Enter your new password below</Text>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your new password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Password must be at least 6 characters long</Text>

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(p => !p)}>
                <Icon name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {password && confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}

            <TouchableOpacity
              style={[styles.btn, (loading || !password || !confirmPassword || password !== confirmPassword) && styles.btnDisabled]}
              onPress={handlePasswordUpdate}
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Update Password</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footer}>For security, you will need to sign in again after updating your password</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f7f2' },
  checkingText: { marginTop: 12, color: GREEN, fontSize: 14 },
  container: { flexGrow: 1, backgroundColor: '#f0f7f2', padding: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  logo: { width: 140, height: 140, resizeMode: 'contain' },
  banner: { backgroundColor: GOLD, borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' },
  bannerText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', marginBottom: 16 },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 },
})
