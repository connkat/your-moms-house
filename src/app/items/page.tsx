'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/lib/supabase';



export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [userItems, setUserItems] = useState<{ [key: number]: number }>({});
  const [itemCommitments, setItemCommitments] = useState<{ [key: number]: { name: string; count: number }[] }>({});
  const [newCounts, setNewCounts] = useState<{ [key: number]: number | undefined }>({});
  const [expandedItems, setExpandedItems] = useState<{ [key: number]: boolean }>({});
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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">Items</h1>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-4 flex justify-center">
            <div className="loader">Loading...</div>
          </div>
        )}

        <div className="space-y-2 mt-6">
          {items.map(item => (
            <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    Total committed: {item.total_count}
                  </p>
                </div>
                <svg
                  className={`h-5 w-5 text-gray-500 transform transition-transform duration-200 ${expandedItems[item.id] ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {expandedItems[item.id] && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">
                    Your commitment: {userItems[item.id] || 0}
                  </p>
                  <div className="text-sm text-gray-500 mb-4">
                    {itemCommitments[item.id]?.map(({ name, count }) => (
                      <span key={name} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-2">
                        {name} ({count})
                      </span>
                    ))}
                  </div>
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
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
