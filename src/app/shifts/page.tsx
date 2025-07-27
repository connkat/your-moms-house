'use client';

import { useCallback, useEffect, useState } from 'react';
import {supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { DbShift, DbShiftSignup, Shift } from '../types';
import { format } from 'date-fns';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const router = useRouter();

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        router.push('/');
        return;
      }
      setUserId(user.id);

      // Fetch all shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .order('shift_start', { ascending: true });
      if (shiftsError) throw shiftsError;

      // Fetch all signups
      const { data: signupsData, error: signupsError } = await supabase
        .from('users_shifts')
        .select('*, profile:profiles(name)');
      if (signupsError) throw signupsError;

      // Process and combine the data
      const processedShifts: Shift[] = (shiftsData as DbShift[]).map(shift => {
        const shiftSignups = (signupsData as DbShiftSignup[])
          .filter(signup => signup.shift_id === shift.id)
          .map(signup => ({
            userId: signup.user_id,
            userName: signup.profile.name,
            created_at: signup.created_at
          }));

        return {
          ...shift,
          signups: shiftSignups,
          count: shiftSignups.length
        };
      });

      setShifts(processedShifts);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  const handleSignup = async (shiftId: number) => {
    try {
      setError(null);
      if (!userId) return;

      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;
      
      if (shift.count >= shift.max_count) {
        setError('This shift is already full');
        return;
      }

      // Insert signup
      const { error: signupError } = await supabase
        .from('users_shifts')
        .insert({
          user_id: userId,
          shift_id: shiftId
        });
      if (signupError) throw signupError;

      await fetchShifts();
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancelSignup = async (shiftId: number) => {
    try {
      setError(null);
      if (!userId) return;

      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      // Delete signup
      const { error: deleteError } = await supabase
        .from('users_shifts')
        .delete()
        .eq('user_id', userId)
        .eq('shift_id', shiftId);
      if (deleteError) throw deleteError;

      await fetchShifts();
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  if (loading) return <div className="p-4">Loading shifts...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Available Shifts</h1>
      
      {shifts.length === 0 ? (
        <p className="text-gray-600">No shifts available.</p>
      ) : (
        <div className="space-y-4">
          {shifts.map(shift => {
            const isSignedUp = shift.signups.some(signup => signup.userId === userId);
            const isFull = shift.count >= shift.max_count;
            const formattedStart = format(new Date(shift.shift_start), 'EEEE, MMMM d, yyyy h:mm a');
            const formattedEnd = format(new Date(shift.shift_end), 'h:mm a');

            return (
              <div key={shift.id} className="border rounded-lg p-4 bg-gray-50">
                {/* Mobile View */}
                <div className="md:hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{shift.event_name}</h3>
                      <p className="text-gray-600">
                        {formattedStart} - {formattedEnd}
                      </p>
                      {shift.description && (
                        <p className="text-gray-600 mt-1">
                          {shift.description}
                        </p>
                      )}
                      <p className="text-gray-600 mt-1">
                        {shift.count} / {shift.max_count} spots filled
                      </p>
                      {shift.signups.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">Signed up:</p>
                          <ul className="text-sm text-gray-600">
                            {shift.signups.map(signup => (
                              <li key={signup.userId}>{signup.userName}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => isSignedUp ? handleCancelSignup(shift.id) : handleSignup(shift.id)}
                      disabled={!isSignedUp && isFull}
                      className={`px-4 py-2 rounded ${
                        isSignedUp
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : isFull
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {isSignedUp ? 'Cancel' : isFull ? 'Full' : 'Sign Up'}
                    </button>
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden md:grid md:grid-cols-3 md:gap-4 md:items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{shift.event_name}</h3>
                    <p className="text-gray-600">
                      {formattedStart} - {formattedEnd}
                    </p>
                    <p className="text-gray-600 mt-1">
                      {shift.count} / {shift.max_count} spots filled
                    </p>
                    {shift.signups.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Signed up:</p>
                        <ul className="text-sm text-gray-600">
                          {shift.signups.map(signup => (
                            <li key={signup.userId}>{signup.userName}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* Description Column */}
                  <div className="px-4">
                    {shift.description && (
                      <p className="text-gray-600">
                        {shift.description}
                      </p>
                    )}
                  </div>

                  {/* Button Column */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => isSignedUp ? handleCancelSignup(shift.id) : handleSignup(shift.id)}
                      disabled={!isSignedUp && isFull}
                      className={`px-4 py-2 rounded ${
                        isSignedUp
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : isFull
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {isSignedUp ? 'Cancel' : isFull ? 'Full' : 'Sign Up'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
