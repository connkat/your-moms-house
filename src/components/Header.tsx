"use client";

import Image from "next/image";
import YMHLogo from "../app/assets/YMH.jpg";
import { useSession } from "@/context/SessionContext";

export default function Header() {
  const { session, signOut } = useSession();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Image
          src={YMHLogo}
          alt="YMH Logo"
          width={200}
          height={100}
          priority
          className="rounded-lg"
        />
        <h1 className="text-xl font-semibold text-gray-900">
          What If 2025 Shared Bar
        </h1>

        {session && (
          <button
            onClick={signOut}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}
