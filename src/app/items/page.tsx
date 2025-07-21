'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/lib/supabase';



export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [userItems, setUserItems] = useState<{ [key: number]: number }>({});
  const [itemCommitments, setItemCommitments] = useState<{ [key: number]: { name: string; count: number }[] }>({});
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

      console.log('Loading data...');
      
      // First, get items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('name');
      
      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        throw itemsError;
      }
      setItems(items || []);

      // Then get user's commitments
      const { data: userCommitments, error: userCommitmentsError } = await supabase
        .from('users_items')
        .select('*')
        .eq('user_id', user.id);
      
      if (userCommitmentsError) {
        console.error('Error fetching user commitments:', userCommitmentsError);
        throw userCommitmentsError;
      }
      setUserItems(
        (userCommitments || []).reduce(
          (acc, item) => ({ ...acc, [item.item_id]: item.count }),
          {}
        )
      );

      // Get profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Create a map of user IDs to names
      const userNames = new Map(profiles?.map(p => [p.id, p.name]) || []);

      // Finally get all commitments
      const { data: allCommitments, error: allCommitmentsError } = await supabase
        .from('users_items')
        .select('item_id, count, user_id')
        .gt('count', 0) // Only get commitments greater than 0
        .order('item_id');
      
      if (allCommitmentsError) {
        console.error('Error fetching all commitments:', allCommitmentsError);
        throw allCommitmentsError;
      }
      
      console.log('All commitments:', allCommitments);

      // Group commitments by item_id
      const commitmentsByItem: { [key: number]: { name: string; count: number }[] } = {};
      for (const item of (allCommitments || [])) {
        const { item_id, count, user_id } = item;
        const name = userNames.get(user_id);
        if (!name) continue;
        
        if (!commitmentsByItem[item_id]) {
          commitmentsByItem[item_id] = [];
        }
        commitmentsByItem[item_id].push({ name, count });
      }
      
      console.log('Grouped commitments:', commitmentsByItem);
      setItemCommitments(commitmentsByItem);
      setError('');
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Error loading items. Please try refreshing.');
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
                    <div className="text-sm text-gray-500 mt-1">
                      {itemCommitments[item.id]?.map(({ name, count }) => (
                        <span key={name} className="mr-3">
                          {name}({count})
                        </span>
                      ))}
                    </div>
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
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                      <button
                        onClick={() => {
                          const newCount = newCounts[item.id];
                          if (newCount !== undefined) {
                            updateCount(item.id, newCount);
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={newCounts[item.id] === undefined || newCounts[item.id] === userItems[item.id]}
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
