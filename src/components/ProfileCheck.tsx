'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { supabase } from '@/lib/supabase';

export default function ProfileCheck({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [showNameForm, setShowNameForm] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkProfile() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();

        if (!profile?.name) {
          setShowNameForm(true);
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, [session?.user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    try {
      setError('');
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          name: name.trim(),
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;
      setShowNameForm(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to save name. Please try again.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return children;
  }

  if (showNameForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please enter your name to continue
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your name"
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return children;
}
