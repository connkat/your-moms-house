'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import Link from 'next/link';

export default function DashboardPage() {

  interface Commitment {
    item_id: number;
    item_name: string;
    count: number;
    category_name: string;
  }

  interface GroupedCommitments {
    [category: string]: Commitment[];
  }

  const [userCommitments, setUserCommitments] = useState<GroupedCommitments>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUserCommitments = useCallback(async () => {
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
            categories_items!inner (categories!inner(name))
          )
        `)
        .eq('user_id', user.id);

      if (commitmentError) throw commitmentError;

      interface DbItem {
        item_id: number;
        count: number;
        items: {
          name: string | null;
          categories_items: Array<{
            categories: {
              name: string | null;
            };
          }>;
        };
      }

      const commitments = (data as unknown as DbItem[] | null)?.map(item => ({
        item_id: item.item_id,
        item_name: item.items?.name || 'Unknown Item',
        count: item.count,
        category_name: item.items.categories_items?.[0]?.categories?.name || 'Uncategorized'
      })) || [];

      // Group commitments by category
      const grouped = commitments.reduce((acc, commitment) => {
        const category = commitment.category_name;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(commitment);
        return acc;
      }, {} as GroupedCommitments);

      // Sort categories alphabetically
      const sortedGrouped = Object.keys(grouped)
        .sort()
        .reduce((acc, key) => {
          acc[key] = grouped[key];
          return acc;
        }, {} as GroupedCommitments);

      setUserCommitments(sortedGrouped);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching commitments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load commitments');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserCommitments();
  }, [fetchUserCommitments]);

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="flex justify-end p-4">
        <Link
          href="/items"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
        >
          Browse All Items
        </Link>
      </div>

      {Object.keys(userCommitments).length === 0 ? (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
              <h1 className="text-2xl font-semibold mb-6 text-gray-900">Your Commitments</h1>
              <p className="text-gray-700">You haven&apos;t committed to bring any items yet.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-2xl font-semibold mb-6 text-gray-900">Your Commitments</h1>
            <div className="space-y-8">
              {Object.entries(userCommitments).map(([category, commitments]) => (
                <div key={category} className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {commitments.map((commitment) => (
                      <div
                        key={commitment.item_id}
                        className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors duration-200 shadow-sm hover:shadow"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {commitment.item_name}
                            </h3>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {commitment.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
