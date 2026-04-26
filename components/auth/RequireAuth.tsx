'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type RequireAuthProps = {
  children: React.ReactNode;
  roles?: string[];                 // e.g. ['admin','member']
  redirectTo?: string;              // e.g. '/login'
  hardRedirect?: boolean;           // true = navigate away; false = show friendly message
  Fallback?: React.ComponentType;   // optional loading/skeleton
  NoAccess?: React.ComponentType;   // optional "no access" UI
};

export default function RequireAuth({
  children,
  roles = ['admin', 'member'],
  redirectTo = '/login',
  hardRedirect = false,
  Fallback,
  NoAccess,
}: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'no-user' | 'no-role' | 'ok'>('loading');

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!user) {
        if (hardRedirect) {
          router.replace(`${redirectTo}?next=${encodeURIComponent(pathname)}`);
        } else {
          setStatus('no-user');
        }
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile?.role || !roles.includes(profile.role)) {
        if (hardRedirect) {
          router.replace('/no-access');
        } else {
          setStatus('no-role');
        }
        return;
      }

      setStatus('ok');
    })();

    return () => { mounted = false; };
  }, [router, pathname, roles, redirectTo, supabase]);

  if (status === 'loading') return Fallback ? <Fallback /> : null;
  if (status === 'no-user')
    return (
      NoAccess ? <NoAccess /> :
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to access this page.</p>
      </div>
    );
  if (status === 'no-role')
    return (
      NoAccess ? <NoAccess /> :
      <div className="text-center py-8">
        <p className="text-gray-600">You need member access to view this page.</p>
      </div>
    );

  return <>{children}</>;
}
