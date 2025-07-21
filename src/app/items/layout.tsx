'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProfileForm from '@/components/ProfileForm';
import type { Profile } from '@/lib/supabase';

export default function ItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }

        // Check if user has a profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setProfile(profileData);
      } catch (error) {
        console.error('Error checking auth/profile:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          router.push('/');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!profile?.name) {
    return <ProfileForm onComplete={() => window.location.reload()} />;
  }

  return <>{children}</>;
}
