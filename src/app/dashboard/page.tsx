'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import Link from 'next/link';

export default function DashboardPage() {

  const [userCommitments, setUserCommitments] = useState<Array<{
    item_id: number;
    item_name: string;
    count: number;
    category_name: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserCommitments();
  }, []);

  const fetchUserCommitments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }


      // Get user's items with their categories
      const { data, error: commitmentError } = await supabase
        .from('users_items')
        .select(`
          item_id,
          count,
          items:items!inner (
            name,
            categories:categories!categories_items!inner (name)
          )
        `)
        .eq('user_id', user.id);

      if (commitmentError) throw commitmentError;

      interface DbItem {
        item_id: number;
        count: number;
        items: {
          name: string | null;
          categories: {
            name: string | null;
          };
        };
      }

      const processedCommitments = (data as unknown as DbItem[] | null)?.map(item => ({
        item_id: item.item_id,
        item_name: item.items?.name || 'Unknown Item',
        count: item.count,
        category_name: item.items.categories?.name || 'Uncategorized'
      })) || [];

      setUserCommitments(processedCommitments);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching commitments:', err);
      setError('Failed to load commitments');
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Commitments</h1>
        <Link
          href="/items"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          View All Items
        </Link>
      </div>

      {userCommitments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">You haven&apos;t committed to bring any items yet.</p>
          <Link
            href="/items"
            className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block"
          >
            Browse available items
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userCommitments.map((commitment) => (
            <div
              key={commitment.item_id}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="text-sm text-indigo-600 mb-2">{commitment.category_name}</div>
              <h3 className="text-xl font-semibold mb-2">{commitment.item_name}</h3>
              <p className="text-gray-600">
                You committed to bring: <span className="font-bold">{commitment.count}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
