'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfileForm({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Auth response:', { user, error: userError });
      
      if (userError) {
        console.error('User error:', userError);
        throw userError;
      }
      
      if (!user) {
        console.error('No user found');
        throw new Error('No user found');
      }



      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      console.log('Update response:', { data, error: updateError });

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Update failed: ${updateError.message}`);
      }

      console.log('Profile updated successfully');
      onComplete();
    } catch (err) {
      console.error('Form submission error:', err);
      setError(
        err instanceof Error 
          ? `Error: ${err.message}` 
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            What&apos;s your name?
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
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm mb-4"
              placeholder="Enter your name"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
