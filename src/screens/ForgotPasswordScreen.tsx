import React, { useState } from 'react'
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

const GREEN = '#1a4725'
const GOLD = '#9f7a49'

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'gardenchurch://reset-password',
      })

      if (error) {
        Alert.alert('Error', error.message)
        return
      }

      Alert.alert(
        'Check Your Email',
        "If an account with that email exists, we've sent you a password reset link. Please check your email and follow the instructions.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
      setEmail('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
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

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset Your Password</Text>
          <Text style={styles.cardSubtitle}>
            Enter your email address and we will send you a link to reset your password
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.btn, (!email.trim() || loading) && styles.btnDisabled]}
            onPress={handlePasswordReset}
            disabled={!email.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send Reset Link</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.backText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Password reset links expire after 1 hour for security</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: '#f0f7f2', padding: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  logo: { width: 140, height: 140, resizeMode: 'contain' },
  banner: { backgroundColor: GOLD, borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' },
  bannerText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 16, backgroundColor: '#fff' },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { alignItems: 'center', marginTop: 16 },
  backText: { color: GREEN, fontSize: 14, fontWeight: '500' },
  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 },
})
