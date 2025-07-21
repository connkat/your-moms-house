'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/lib/supabase';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [userItems, setUserItems] = useState<{ [key: number]: number }>({});
  const [newCounts, setNewCounts] = useState<{ [key: number]: number | undefined }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const [itemsResponse, userItemsResponse] = await Promise.all([
        supabase.from('items').select('*').order('name'),
        supabase.from('users_items').select('*').eq('user_id', user.id)
      ]);

      if (itemsResponse.error) throw itemsResponse.error;
      if (userItemsResponse.error) throw userItemsResponse.error;

      setItems(itemsResponse.data || []);
      setUserItems(
        (userItemsResponse.data || []).reduce(
          (acc, item) => ({ ...acc, [item.item_id]: item.count }),
          {}
        )
      );
      setError('');
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error loading items. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateCount = async (itemId: number, newCount: number) => {
    if (newCount < 0) return;
    
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const currentCount = userItems[itemId] || 0;

      // Update user's commitment
      const { error: upsertError } = await supabase
        .from('users_items')
        .upsert({
          user_id: user.id,
          item_id: itemId,
          count: newCount,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,item_id'
        });

      if (upsertError) {
        console.error('Error upserting user item:', upsertError);
        throw new Error('Failed to update your commitment');
      }

      // Update total count
      const { error: updateError } = await supabase.rpc('update_total_count', {
        p_item_id: itemId,
        p_count: newCount - currentCount
      });

      // Refresh data to get the updated total
      await loadData();

      if (updateError) {
        console.error('Error updating total count:', updateError);
        throw new Error('Failed to update total count');
      }

      // Reset the new count input
      setNewCounts(prev => ({
        ...prev,
        [itemId]: undefined
      }));
    } catch (err) {
      console.error('Error updating item:', err);
      setError(err instanceof Error ? err.message : 'Error updating item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            What are you bringing?
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Update the quantities to commit to bringing items
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      Total committed: {item.total_count}
                    </p>
                    <p className="text-sm text-gray-500">
                      Your commitment: {userItems[item.id] || 0}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        placeholder={String(userItems[item.id] || 0)}
                        value={newCounts[item.id] === undefined ? '' : newCounts[item.id]}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                          setNewCounts(prev => ({
                            ...prev,
                            [item.id]: value
                          }));
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        onClick={() => updateCount(item.id, newCounts[item.id] ?? userItems[item.id] ?? 0)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={newCounts[item.id] === undefined}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
