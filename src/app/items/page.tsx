"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type DbProfile = {
  name: string;
};

type DbUserItemResponse = {
  item_id: number;
  count: number;
  user_id: string;
  profile: DbProfile;
};

type ItemWithCommitments = {
  id: number;
  name: string;
  description?: string;
  total_count: number;
  created_at: string;
  commitments: {
    count: number;
    userName: string;
  }[];
};

type CategoryWithItems = {
  id: number;
  name: string;
  created_at: string;
  items: ItemWithCommitments[];
};

type DbCategory = {
  id: number;
  name: string;
  created_at: string;
  items: {
    id: number;
    name: string;
    description?: string;
    total_count: number;
    created_at: string;
  }[];
};

type Commitment = {
  count: number;
  userName: string;
};

export default function ItemsPage() {
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: boolean;
  }>({});
  const [newCounts, setNewCounts] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      console.log("Loading data...");

      // First, get items

      // Fetch user commitments
      const { data: userItemsData, error: userItemsError } = await supabase
        .from("users_items")
        .select(
          `
          item_id,
          count,
          user_id,
          profile:profiles!inner(name)
        `
        )
        .eq("user_id", user.id);

      if (userItemsError) throw userItemsError;

      // Fetch categories with their items
      const { data: categoriesData, error: categoriesError } =
        await supabase.from("categories").select(`
          *,
          categories_items!inner (item_id),
          items!categories_items (id, name, description, total_count)
        `);

      if (categoriesError) throw categoriesError;

      // Process the data
      const processedCategories = (categoriesData || []).map(
        (category: DbCategory): CategoryWithItems => {
          const items = (category.items || []).map(
            (item): ItemWithCommitments => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const validUserItems = (
                (userItemsData || []) as Record<string, any>[]
              ).filter((ui): ui is DbUserItemResponse => {
                if (
                  !ui ||
                  typeof ui.item_id !== "number" ||
                  typeof ui.count !== "number"
                )
                  return false;
                if (!ui.user_id || typeof ui.user_id !== "string") return false;
                return ui.profile && typeof ui.profile.name === "string";
              });

              const commitments = validUserItems
                .filter((ui) => ui.item_id === item.id)
                .map(
                  (ui): Commitment => ({
                    count: ui.count,
                    userName: ui.profile.name,
                  })
                );

              return {
                ...item,
                commitments,
                created_at: item.created_at,
              };
            }
          );

          return {
            ...category,
            items,
          } as CategoryWithItems;
        }
      );

      setCategories(processedCategories);
    } catch (error) {
      console.error("Error fetching items:", error);
      setError("Failed to load items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const updateCount = async (itemId: number) => {
    setIsUpdating(true);
    try {
      const newCount = newCounts[itemId];
      if (typeof newCount !== "number") return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      const currentCount = 0; // We'll get this from the server

      const { error: upsertError } = await supabase.from("users_items").upsert(
        {
          user_id: user.id,
          item_id: itemId,
          count: newCount,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,item_id",
        }
      );

      if (upsertError) {
        console.error("Error upserting user item:", upsertError);
        throw new Error("Failed to update your commitment");
      }

      // Update total count
      const { error: updateError } = await supabase.rpc("update_total_count", {
        p_item_id: itemId,
        p_count: newCount - currentCount,
      });

      if (updateError) {
        console.error("Error updating total count:", updateError);
        throw new Error("Failed to update total count");
      }

      // Reset the new count input
      const { [itemId]: removed, ...rest } = newCounts;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = removed; // Acknowledge the unused variable
      setNewCounts(rest);
    } catch (err) {
      console.error("Error updating item:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error updating item. Please try again."
      );
    } finally {
      setIsUpdating(false);
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
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 mt-6">
          {categories.map((category) => (
            <div key={category.id} className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {category.name}
              </h2>
              {category.items?.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                >
                  <button
                    onClick={() =>
                      setExpandedItems((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {item.name}:{" "}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Total committed: {item.total_count}
                      </p>
                    </div>
                    <svg
                      className={`h-5 w-5 text-gray-500 transform transition-transform duration-200 ${
                        expandedItems[item.id] ? "rotate-180" : ""
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {expandedItems[item.id] && (
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor={`count-${item.id}`}
                            className="block text-sm font-medium text-black"
                          >
                            Your commitment: {item.commitments.find(c => c.count > 0)?.count || 0}
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm text-black">
                            <input
                              type="number"
                              name={`count-${item.id}`}
                              id={`count-${item.id}`}
                              min="0"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              value={newCounts[item.id] ?? 0}
                              onChange={(e) => {
                                const value = Math.max(
                                  0,
                                  parseInt(e.target.value) || 0
                                );
                                setNewCounts(
                                  (prev: { [key: number]: number }) => ({
                                    ...prev,
                                    [item.id]: value,
                                  })
                                );
                              }}
                            />
                            <button
                              onClick={() => updateCount(item.id)}
                              disabled={isUpdating}
                              className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Update
                            </button>
                          </div>
                        </div>

                        {item.commitments && item.commitments.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              Current commitments
                            </h4>
                            <ul className="mt-2 divide-y divide-gray-200">
                              {item.commitments.map(
                                (commitment: Commitment, idx: number) => (
                                  <li key={idx} className="py-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        <span className="text-sm text-gray-900">
                                          {commitment.userName}
                                        </span>
                                      </div>
                                      <span className="text-sm text-gray-500">
                                        {commitment.count}
                                      </span>
                                    </div>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
