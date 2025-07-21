'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProfileForm from '@/components/ProfileForm';
import ClientOnly from '@/components/ClientOnly';
import { useSession } from '@/context/SessionContext';
import type { Profile } from '@/lib/supabase';

export default function ItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      if (sessionLoading) return;
      
      if (!session) {
        router.push('/');
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // Profile not found, create one
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                name: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (createError) throw createError;
            setProfile(newProfile);
          } else {
            throw profileError;
          }
        } else {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Error checking profile:', err);
        setError('Error loading profile. Please try refreshing.');
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [router, session, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile?.name) {
    return (
      <ClientOnly>
        <ProfileForm onComplete={() => window.location.reload()} />
      </ClientOnly>
    );
  }

  return <>{children}</>;
}
