'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu, X } from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
  role: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export default function NavBar() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setLoading(true);
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setUser(null);
          setProfile(null);
          return;
        }

        setUser({ id: user.id, email: user.email ?? '' });

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, first_name, last_name, email')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          // If no profile exists, set default guest role
          if (profileError.code === 'PGRST116') {
            setProfile({ role: 'guest' });
          } else {
            console.error('Profile fetch error:', profileError);
            setProfile({ role: 'guest' });
          }
        } else {
          setProfile({
            role: profileData?.role || 'guest',
            first_name: profileData?.first_name,
            last_name: profileData?.last_name,
            email: profileData?.email
          });
        }
        
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOpen(false);
    router.push('/login');
  };

  const role = profile?.role;
  const isAdmin = role === 'admin';
  const canAccessPrayer = ['admin', 'member'].includes(role || '');
  
  const getDisplayName = (): string => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'User';
  };

  if (loading) {
    return (
      <header className="w-full px-4 py-3 md:py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center space-x-2 md:space-x-3">
            <Image src="/logo.png" alt="Logo" width={20} height={20} className="md:w-6 md:h-6" />
            <span className="font-bold text-lg md:text-xl text-black">The Garden</span>
          </Link>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full px-4 py-3 md:py-4 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2 md:space-x-3">
          <Image src="/logo.png" alt="Logo" width={20} height={20} className="md:w-6 md:h-6" />
          <span className="font-bold text-lg md:text-xl text-black">The Garden</span>
        </Link>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden hover:bg-[#1a4725]/10"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5 text-[#1a4725]" /> : <Menu className="h-5 w-5 text-[#1a4725]" />}
        </Button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {user ? (
            <>
              <Link 
                href="/announcements" 
                className="text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
              >
                Announcements
              </Link>
              <Link 
                href="/events" 
                className="text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
              >
                Events
              </Link>
              {canAccessPrayer && (
                <Link 
                  href="/prayer-requests" 
                  className="text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                >
                  Prayer
                </Link>
              )}
              <Link 
                href="/volunteer" 
                className="text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
              >
                Volunteer
              </Link>
              <Link 
                href="/love-action" 
                className="text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
              >
                Love in Action
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                >
                  Admin
                </Link>
              )}
              
              {/* User Info & Sign Out */}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#1a4725]" />
                  <span className="text-sm font-medium text-gray-700">
                    {getDisplayName()}
                  </span>
                  {role && role !== 'guest' && (
                    <span className="text-xs bg-[#1a4725]/10 text-[#1a4725] px-2 py-1 rounded-full border border-[#1a4725]/20 font-medium">
                      {role}
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="text-[#9f7a49] border-[#9f7a49]/30 hover:bg-[#9f7a49]/10 hover:border-[#9f7a49]/50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-[#1a4725]/30 text-[#1a4725] hover:bg-[#1a4725]/10"
                >
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button 
                  size="sm" 
                  className="bg-[#1a4725] hover:bg-[#1a4725]/90 text-white"
                >
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      {open && (
        <div className="md:hidden mt-4 border-t border-gray-200 pt-4 space-y-4 max-w-7xl mx-auto">
          {user ? (
            <>
              {/* Mobile Navigation Links */}
              <nav className="space-y-3">
                <Link 
                  href="/announcements" 
                  onClick={() => setOpen(false)}
                  className="block py-2 text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                >
                  Announcements
                </Link>
                 {canAccessPrayer && (
                  <Link 
                    href="/prayer-requests" 
                    onClick={() => setOpen(false)}
                    className="block py-2 text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                  >
                    Prayer Requests
                  </Link>
                )}
                {canAccessPrayer && (
                  <Link 
                    href="/events" 
                    onClick={() => setOpen(false)}
                    className="block py-2 text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                  >
                    Events
                  </Link>
                )}
                <Link 
                  href="/volunteer" 
                  onClick={() => setOpen(false)}
                  className="block py-2 text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                >
                  Volunteer
                </Link>
                <Link 
                  href="/love-action" 
                  onClick={() => setOpen(false)}
                  className="block py-2 text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                >
                  Love in Action
                </Link>
                  <Link 
                  href="/cellgroup" 
                  onClick={() => setOpen(false)}
                  className="block py-2 text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                >
                  Cell Group
                </Link>
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    onClick={() => setOpen(false)}
                    className="block py-2 text-gray-700 hover:text-[#1a4725] transition-colors font-medium"
                  >
                    Admin
                  </Link>
                )}
              </nav>
              
              {/* Mobile User Info */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-center gap-2 text-[#1a4725]">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {getDisplayName()}
                  </span>
                  {role && role !== 'guest' && (
                    <span className="text-xs bg-[#1a4725]/10 text-[#1a4725] px-2 py-1 rounded-full border border-[#1a4725]/20 font-medium">
                      {role}
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full text-[#9f7a49] border-[#9f7a49]/30 hover:bg-[#9f7a49]/10 justify-start"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button 
                  variant="outline" 
                  className="w-full border-[#1a4725]/30 text-[#1a4725] hover:bg-[#1a4725]/10"
                >
                  Login
                </Button>
              </Link>
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button 
                  className="w-full bg-[#1a4725] hover:bg-[#1a4725]/90 text-white"
                >
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}