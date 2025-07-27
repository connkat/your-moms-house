"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import Link from "next/link";

export default function DashboardPage() {
  interface Commitment {
    item_id: number;
    item_name: string;
    count: number;
    category_name: string;
    category_id: number;
  }

  interface GroupedCommitments {
    [category: string]: Commitment[];
  }

  const [userCommitments, setUserCommitments] = useState<GroupedCommitments>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUserCommitments = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      // Get user's items with their categories
      const { data, error: commitmentError } = await supabase
        .from("users_items")
        .select(
          `
          item_id,
          count,
          items:items!inner (name, categories_items:categories_items!inner(categories:categories!inner(id, name)))
        `
        )
        .eq("user_id", user.id);

      if (commitmentError) throw commitmentError;

      interface DbItem {
        item_id: number;
        count: number;
        items: {
          name: string | null;
          categories_items: Array<{
            categories: {
              id: number | null;
              name: string | null;
            };
          }>;
        };
      }

      const commitments =
        (data as unknown as DbItem[] | null)
          ?.filter((item: DbItem) => item.count > 0)
          .map((item: DbItem) => ({
            item_id: item.item_id,
            item_name: item.items?.name || "Unknown Item",
            count: item.count,
            category_name:
              item.items.categories_items?.[0]?.categories?.name ||
              "Uncategorized",
            category_id:
              item.items.categories_items?.[0]?.categories?.id || 999,
          })) || [];

      // Group commitments by category
      const grouped = commitments.reduce<GroupedCommitments>(
        (acc, commitment) => {
          const category = commitment.category_name;
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(commitment);
          return acc;
        },
        {} as GroupedCommitments
      );

      // Sort categories by ID
      const sortedGrouped = Object.entries(grouped)
        .sort(([, commitments1], [, commitments2]) => {
          const id1 = (commitments1 as Commitment[])[0]?.category_id || 999;
          const id2 = (commitments2 as Commitment[])[0]?.category_id || 999;
          return id1 - id2;
        })
        .reduce<GroupedCommitments>((acc, [key, value]) => {
          acc[key] = value as Commitment[];
          return acc;
        }, {});

      setUserCommitments(sortedGrouped);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching commitments:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load commitments"
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserCommitments();
  }, [fetchUserCommitments]);

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;

  return (
    <div>
      <div className="border border-gray-200 p-6 rounded-lg overflow-hidden bg-white shadow-sm text-gray-500">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm sm:text-base">
              We&apos;re testing this out to see if it can simplify the process
              of organizing for Your Mom&apos;s House bar at What If this year.
            </p>
            <p className="text-sm sm:text-base">
              Navigate to{" "}
              <Link href="/items" className="text-indigo-600">
                Items
              </Link>{" "}
              to signup for items that we need the crew to bring this year.
            </p>
            <p className="text-sm sm:text-base">
              Go to{" "}
              <Link href="/shifts" className="text-indigo-600">
                Shifts
              </Link>{" "}
              to sign up for a bar shift.
            </p>
            <p className="text-sm sm:text-base">
              <b>
                Please note that this is just for the bar, we&apos;re not
                currently setup to use this for other shared items or shifts.
              </b>
            </p>
          </div>
          <div className="flex justify-end p-4">
            <Link
              href="/items"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              Browse All Items
            </Link>
            
          </div>
          <div className="flex justify-end p-4">
            <Link
              href="/shifts"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              Browse All Shifts
            </Link>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white">
        {Object.keys(userCommitments).length === 0 ? (
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
                <h1 className="text-2xl font-semibold mb-6 text-gray-900">
                  Your Commitments
                </h1>
                <p className="text-gray-700">
                  You haven&apos;t committed to bring any items yet.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <h1 className="text-2xl font-semibold mb-6 text-gray-900">
                Your Commitments
              </h1>
              <div className="space-y-8">
                {Object.entries(userCommitments).map(
                  ([category, commitments]) => (
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
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
