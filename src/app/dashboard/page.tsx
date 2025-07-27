"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import Link from "next/link";
import type { Shift } from "../types";

export default function DashboardPage() {
  interface Commitment {
    item_id: number;
    item_name: string;
    count: number;
    category_name: string;
    category_id: number;
    category_order: number;
  }

  interface GroupedCommitments {
    [category: string]: Commitment[];
  }

  const [userCommitments, setUserCommitments] = useState<GroupedCommitments>(
    {}
  );
  const [userShifts, setUserShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUserData = useCallback(async () => {
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
          items:items!inner (name, categories_items:categories_items!inner(categories:categories!inner(id, name, order)))
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
              order: number;
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
            category_order:
              item.items.categories_items?.[0]?.categories?.order || 999,
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

      // Sort categories by order
      const sortedGrouped = Object.entries(grouped)
        .sort(([, commitments1], [, commitments2]) => {
          const order1 = (commitments1 as Commitment[])[0]?.category_order || 999;
          const order2 = (commitments2 as Commitment[])[0]?.category_order || 999;
          return order1 - order2;
        })
        .reduce<GroupedCommitments>((acc, [key, value]) => {
          acc[key] = value as Commitment[];
          return acc;
        }, {});

      setUserCommitments(sortedGrouped);

      // Fetch user's shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("shifts")
        .select("*, users_shifts!inner(*)")
        .eq("users_shifts.user_id", user.id)
        .order("shift_start", { ascending: true });

      if (shiftsError) throw shiftsError;
      setUserShifts(shiftsData || []);

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
    fetchUserData();
  }, [fetchUserData]);

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;

  return (
    <div>
      <div className="border border-gray-200 p-6 rounded-lg overflow-hidden bg-white shadow-sm text-gray-500">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2 flex-1">
            <h2 className="text-xl font-semibold text-gray-900">Instructions:</h2>
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
          </div>
        </div>
      </div>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Shifts Section */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Your Shifts
                  </h1>
                  <Link
                    href="/shifts"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Shifts
                  </Link>
                </div>
                {userShifts.length === 0 ? (
                  <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
                    <p className="text-gray-700">
                      You haven&apos;t signed up for any shifts yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {userShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="border border-gray-200 rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {shift.event_name}
                            </h3>
                            <p className="text-gray-600">
                              {format(
                                new Date(shift.shift_start),
                                "EEEE, MMMM d, yyyy h:mm a"
                              )}{" "}
                              - {format(new Date(shift.shift_end), "h:mm a")}
                            </p>
                            {shift.description && (
                              <div 
                                className="text-gray-600 mt-2"
                                dangerouslySetInnerHTML={{ __html: shift.description }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Your Items
                  </h1>
                  <Link
                    href="/items"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Items
                  </Link>
                </div>
                <div className="space-y-8">
                  {Object.entries(userCommitments).map(
                    ([category, commitments]) => (
                      <div key={category} className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                          {category}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}
