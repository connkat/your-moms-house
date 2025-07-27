"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BonusItemForm({
  onItemAdded,
}: {
  onItemAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setError("Not authenticated");
        return;
      }

      // First insert the item
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .insert({
          name,
          description,
          max_count: 0,
          total_count: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Create the category-item relationship
      const { error: relationError } = await supabase
        .from("categories_items")
        .insert({
          category_id: 10,
          item_id: itemData.id,
        });

      if (relationError) throw relationError;

      // Create the user-item relationship
      const { error: userItemError } = await supabase
        .from("users_items")
        .insert({
          user_id: user.id,
          item_id: itemData.id,
          count: 0,
          created_at: new Date().toISOString(),
        });

      if (userItemError) throw userItemError;

      // Reset form
      setName("");
      setDescription("");
      onItemAdded();
    } catch (err) {
      console.error("Error adding item:", err);
      setError(err instanceof Error ? err.message : "Error adding item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Item Name
        </label>
        <input
          type="text"
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 text-black"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 text-black"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Adding..." : "Add Item"}
      </button>
    </form>
  );
}
