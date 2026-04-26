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
import Icon from '../components/Icon'

const GREEN = '#1a4725'
const GOLD = '#9f7a49'

export default function LoginScreen() {
  const navigation = useNavigation<any>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const createUserProfile = async (userId: string, first: string, last: string, emailAddr: string) => {
    try {
      await supabase.from('user_profiles').insert([{
        user_id: userId,
        first_name: first,
        last_name: last,
        email: emailAddr,
        role: 'visitor',
      }])
    } catch (err) {
      console.error('Error creating user profile:', err)
    }
  }

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.')
      return
    }
    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      Alert.alert('Error', 'Please enter your first and last name.')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
        })
        if (error) {
          Alert.alert('Sign Up Error', error.message)
          return
        }
        if (data.user && data.session) {
          await createUserProfile(data.user.id, firstName.trim(), lastName.trim(), email.trim())
          navigation.replace('Home')
        } else {
          Alert.alert(
            'Check Your Email',
            'Account created! Please check your email to confirm your account before signing in.',
            [{ text: 'OK', onPress: () => { toggleMode(); } }]
          )
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          Alert.alert('Sign In Error', error.message)
          return
        }
        if (data.session) {
          navigation.replace('Home')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(prev => !prev)
    setEmail('')
    setPassword('')
    setFirstName('')
    setLastName('')
  }

  return (
    <SafeAreaView style={styles.flex}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
        </View>

        {/* Header Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Our Garden</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
          <Text style={styles.cardSubtitle}>
            {isSignUp ? 'Join our church community' : 'Sign in to access member resources'}
          </Text>

          {isSignUp && (
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="John"
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.halfField, { marginLeft: 12 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Doe"
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder={isSignUp ? 'Create a strong password' : 'Enter your password'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
              <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {isSignUp && <Text style={styles.hint}>Password must be at least 6 characters long</Text>}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBtn} onPress={toggleMode} disabled={loading}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </TouchableOpacity>

          {!isSignUp && (
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword' as never)}
            >
              <Text style={styles.forgotText}>Forgot your password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => navigation.replace('Home')}
            disabled={loading}
          >
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>By signing in, you agree to our community guidelines</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: '#f0f7f2', padding: 16 },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
  banner: {
    backgroundColor: GOLD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  bannerText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', marginBottom: 4 },
  halfField: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000', marginBottom: 16, backgroundColor: '#fff' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', marginBottom: 16 },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#000' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: -12, marginBottom: 16 },
  btn: { backgroundColor: GREEN, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchBtn: { alignItems: 'center', marginTop: 16 },
  switchText: { color: GREEN, fontSize: 14, fontWeight: '500' },
  forgotBtn: { alignItems: 'center', marginTop: 12 },
  forgotText: { color: '#9ca3af', fontSize: 13 },
  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 },
  guestBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 12 },
  guestText: { color: '#9ca3af', fontSize: 14, textDecorationLine: 'underline' },
})
