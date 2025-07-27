"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CategoryWithItems,
  ItemWithCommitments,
  Commitment,
  DbUserItemResponse,
  DbCategory,
} from "@/app/types";
import BonusItemForm from "@/components/BonusItemForm";
import Modal from "@/components/Modal";

export default function ItemsPage() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: boolean;
  }>({});
  const [newCounts, setNewCounts] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<{
    [key: number]: boolean;
  }>({});
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

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
          items!categories_items (id, name, description, max_count, total_count)
        `);

      if (categoriesError) throw categoriesError;

      // Process the data
      const processedCategories = (categoriesData || []).map(
        (category: DbCategory): CategoryWithItems => {
          const items = (category.items || []).map(
            (item): ItemWithCommitments => {
              const validUserItems =
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((userItemsData || []) as Record<string, any>[]).filter(
                  (ui): ui is DbUserItemResponse => {
                    if (
                      !ui ||
                      typeof ui.item_id !== "number" ||
                      typeof ui.count !== "number"
                    )
                      return false;
                    if (!ui.user_id || typeof ui.user_id !== "string")
                      return false;
                    return ui.profile && typeof ui.profile.name === "string";
                  }
                );

              const commitments = validUserItems
                .filter((ui) => ui.item_id === item.id)
                .map(
                  (ui): Commitment => ({
                    count: ui.count,
                    userName: ui.profile.name || "Unknown",
                    userId: ui.user_id,
                  })
                );

              return {
                ...item,
                commitments,
                created_at: item.created_at,
                id: item.id,
                name: item.name,
                total_count: item.total_count,
                max_count: item.max_count,
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

      // Initialize newCounts with current commitment values
      const initialCounts: { [key: number]: number } = {};
      processedCategories.forEach((category) => {
        category.items.forEach((item) => {
          const currentCommitment = item.commitments.find((c) => c.count > 0);
          if (currentCommitment) {
            initialCounts[item.id] = currentCommitment.count;
          }
        });
      });
      setNewCounts(initialCounts);
    } catch (error) {
      console.error("Error fetching items:", error);
      setError("Failed to load items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      // First delete the category-item relationship
      const { error: relationError } = await supabase
        .from("categories_items")
        .delete()
        .eq("item_id", itemId);

      if (relationError) throw relationError;

      // Then delete the users-items relationships
      const { error: userItemError } = await supabase
        .from("users_items")
        .delete()
        .eq("item_id", itemId);

      if (userItemError) throw userItemError;

      // Finally delete the item itself
      const { error: itemError } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);

      if (itemError) throw itemError;

      // Refresh the items list
      fetchItems();
    } catch (err) {
      console.error("Error deleting item:", err);
      setError(err instanceof Error ? err.message : "Error deleting item");
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
    fetchItems();
  }, []);

  const updateCount = async (itemId: number) => {
    setUpdatingItems((prev) => ({ ...prev, [itemId]: true }));
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

      // Get the user's current commitment for this item
      const { data: currentCommitment } = await supabase
        .from("users_items")
        .select("count")
        .eq("user_id", user.id)
        .eq("item_id", itemId)
        .single();

      const currentCount = currentCommitment?.count || 0;
      const countDifference = newCount - currentCount;

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

      // Update total count with the difference
      const { error: updateError } = await supabase.rpc("update_total_count", {
        p_item_id: itemId,
        p_count: countDifference,
      });

      if (updateError) {
        console.error("Error updating total count:", updateError);
        throw new Error("Failed to update total count");
      }

      // Reset the new count input and refresh data
      const { [itemId]: removed, ...rest } = newCounts;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = removed;
      setNewCounts(rest);

      // Refresh to get updated totals
      await fetchItems();
    } catch (err) {
      console.error("Error updating item:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error updating item. Please try again."
      );
    } finally {
      setUpdatingItems((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="border border-gray-200 p-6 rounded-lg overflow-hidden bg-white shadow-sm text-gray-500">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="space-y-2 flex-1">
              <p className="text-sm sm:text-base">
                To use, just add to the count of what you are bringing to help
                stock the bar at YMH.
              </p>
              <p className="text-sm sm:text-base">
                If you&apos;re bringing something that isn&apos;t already on the
                list <b>for the bar</b>, click the button{" "}
                {window.innerWidth >= 640 ? "to the right" : "below"} to add it.
              </p>
              <p className="text-sm sm:text-base">
                <b>
                  Please note that this is just for the bar, we&apos;re not
                  currently setup to use this for other shared items.
                </b>
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto sm:ml-8">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Add New Item
              </button>
            </div>
          </div>
        </div>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add a New Item"
        >
          <BonusItemForm
            onItemAdded={() => {
              fetchItems();
              setIsModalOpen(false);
            }}
          />
        </Modal>
        <div className="space-y-6 mt-6">
          {categories.map((category) => (
            <div key={category.id} className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {category.name}
              </h2>
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white shadow-sm rounded-lg overflow-hidden"
                >
                  {category.id === 3 ? (
                    // Simple display for category 3 items
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.commitments.some(
                          (c) => c.userId === currentUserId
                        ) && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800 focus:outline-none"
                          >
                            <span className="sr-only">Delete item</span>
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Regular accordion display for other categories
                    <div>
                      <button
                        onClick={() =>
                          setExpandedItems((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }))
                        }
                        className="w-full px-3 py-4 sm:px-4 sm:py-5 flex items-start justify-between focus:outline-none"
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="flex flex-col sm:flex-row sm:items-center w-full">
                            <h3 className="text-base sm:text-lg font-medium text-gray-900">
                              {item.name}:
                            </h3>
                            {item.description && (
                              <p className="mt-1 sm:mt-0 sm:ml-2 text-sm text-gray-500">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-baseline gap-4">
                            <p className="text-sm text-gray-500">
                              Total committed: {item.total_count}
                            </p>
                            <p className="text-sm text-gray-500">
                              Total needed: {item.max_count}
                            </p>
                            <p
                              className={`text-sm ${
                                item.max_count - item.total_count > 10
                                  ? "text-red-500"
                                  : item.max_count - item.total_count > 1
                                  ? "text-orange-400"
                                  : "text-green-500"
                              }`}
                            >
                              Needed: {item.max_count - item.total_count}
                            </p>
                          </div>
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
                                Your commitment:{" "}
                                {item.commitments.find((c) => c.count > 0)
                                  ?.count || 0}
                              </label>
                              <div className="mt-1 flex max-w-32 rounded-md shadow-sm text-black">
                                <input
                                  type="number"
                                  name={`count-${item.id}`}
                                  id={`count-${item.id}`}
                                  min="0"
                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-center"
                                  value={newCounts[item.id] ?? 0}
                                  onChange={(e) => {
                                    const value = Math.max(
                                      0,
                                      parseInt(e.target.value) || 0
                                    );
                                    setNewCounts((prev) => ({
                                      ...prev,
                                      [item.id]: value,
                                    }));
                                  }}
                                />
                                <button
                                  onClick={() => updateCount(item.id)}
                                  disabled={updatingItems[item.id]}
                                  className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {updatingItems[item.id]
                                    ? "Updating..."
                                    : "Update"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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
