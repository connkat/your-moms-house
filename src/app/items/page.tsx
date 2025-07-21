'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Item, UserItem } from '@/lib/supabase';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all items
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .order('name');
      
      // Fetch user's commitments
      const { data: userItemsData } = await supabase
        .from('users_items')
        .select('*')
        .eq('user_id', user.id);

      if (itemsData) setItems(itemsData);
      if (userItemsData) setUserItems(userItemsData);
      setLoading(false);
    };

    fetchItems();
  }, []);

  const handleIncrement = async (itemId: number, count: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user already has a commitment for this item
      const existingUserItem = userItems.find(ui => ui.item_id === itemId);

      if (existingUserItem) {
        // Update existing commitment
        const { error } = await supabase
          .from('users_items')
          .update({ count: existingUserItem.count + count })
          .eq('id', existingUserItem.id);

        if (error) throw error;

        setUserItems(userItems.map(ui => 
          ui.id === existingUserItem.id 
            ? { ...ui, count: ui.count + count }
            : ui
        ));
      } else {
        // Create new commitment
        const { data: newUserItem, error } = await supabase
          .from('users_items')
          .insert([
            { user_id: user.id, item_id: itemId, count }
          ])
          .select()
          .single();

        if (error) throw error;
        if (newUserItem) setUserItems([...userItems, newUserItem]);
      }

      // Update total count in items table
      const { error } = await supabase.rpc('increment_item_count', {
        p_item_id: itemId,
        p_count: count
      });

      if (error) throw error;

      // Update local items state
      setItems(items.map(item =>
        item.id === itemId
          ? { ...item, total_count: item.total_count + count }
          : item
      ));
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error updating item. Please try again.');
    }
  };

  const getUserCommitment = (itemId: number) => {
    return userItems.find(ui => ui.item_id === itemId)?.count || 0;
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            What are you bringing?
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Click the buttons to commit to bringing items
          </p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Total committed: {item.total_count}
                    </p>
                    {getUserCommitment(item.id) > 0 && (
                      <p className="mt-1 text-sm text-green-600">
                        You&apos;re bringing: {getUserCommitment(item.id)}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleIncrement(item.id, 1)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleIncrement(item.id, 2)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      +2
                    </button>
                    <button
                      onClick={() => handleIncrement(item.id, 3)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      +3
                    </button>
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
