'use client';

import { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import ClientOnly from '@/components/ClientOnly';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';

export default function Home() {
  const router = useRouter();
  const { session } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check - in a real app, this should be more secure
    if (password === 'yourmom') {
      setShowAuth(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        {!showAuth ? (
          <>
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Welcome to Your Mom&apos;s House
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter the password to continue
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter password"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
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
          </>
        ) : (
          <div className="auth-container">
            <ClientOnly>
              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#4F46E5',
                        brandAccent: '#4338CA'
                      }
                    }
                  }
                }}
                providers={[]}
                view="magic_link"
                showLinks={false}
                redirectTo={`${window.location.origin}/dashboard`}
              />
            </ClientOnly>
          </div>
        )}
      </div>
    </div>
  );
}
