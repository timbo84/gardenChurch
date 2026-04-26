/**
 * RequireAuth — guards a subtree based on Supabase auth + role check.
 *
 * ⚠️  REQUIRES INSTALLATION:
 *   npm install @supabase/supabase-js
 *
 * Create a shared Supabase client at src/lib/supabase.ts:
 *   import { createClient } from '@supabase/supabase-js';
 *   export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 *
 * Changes from web version:
 *   - usePathname / useRouter removed (React Navigation handles routing)
 *   - hardRedirect uses navigation.replace() instead of router.replace()
 *   - @supabase/ssr → @supabase/supabase-js
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

type AuthUser = { id: string; email: string } | null;
type AuthProfile = { role: string } | null;

type RequireAuthProps = {
  children: React.ReactNode;
  roles?: string[];
  redirectTo?: string;        // navigation route name, e.g. 'Login'
  hardRedirect?: boolean;
  Fallback?: React.ComponentType;
  NoAccess?: React.ComponentType;
};

// ─── Stub helpers — replace bodies with real Supabase calls ──────────────────

async function getAuthUser(): Promise<AuthUser> {
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { id: user.id, email: user.email ?? '' } : null
}

async function getUserProfile(userId: string): Promise<AuthProfile> {
  const { data } = await supabase.from('user_profiles').select('role').eq('user_id', userId).single()
  return data ?? null
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RequireAuth({
  children,
  roles = ['admin', 'member'],
  redirectTo = 'Login',
  hardRedirect = false,
  Fallback,
  NoAccess,
}: RequireAuthProps) {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<'loading' | 'no-user' | 'no-role' | 'ok'>('loading');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const user = await getAuthUser();
        if (!mounted) return;

        if (!user) {
          if (hardRedirect) {
            navigation.replace(redirectTo);
          } else {
            setStatus('no-user');
          }
          return;
        }

        const profile = await getUserProfile(user.id);
        if (!mounted) return;

        const profileRole = profile?.role ?? '';
        if (!profileRole || !roles.includes(profileRole)) {
          if (hardRedirect) {
            navigation.replace(redirectTo);
          } else {
            setStatus('no-role');
          }
          return;
        }

        setStatus('ok');
      } catch {
        setStatus('no-user');
      }
    })();

    return () => { mounted = false; };
  }, [hardRedirect, redirectTo, roles]);

  if (status === 'loading') return Fallback ? <Fallback /> : null;

  if (status === 'no-user') {
    return NoAccess ? <NoAccess /> : (
      <View style={styles.center}>
        <Text style={styles.message}>Please sign in to access this page.</Text>
      </View>
    );
  }

  if (status === 'no-role') {
    return NoAccess ? <NoAccess /> : (
      <View style={styles.center}>
        <Text style={styles.message}>You need member access to view this page.</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});
