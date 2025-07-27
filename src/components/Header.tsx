"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import YMHLogo from "../app/assets/YMH.jpg";
import { useSession } from "@/context/SessionContext";

export default function Header() {
  const { session, signOut } = useSession();
  const pathname = usePathname();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <a href="/dashboard">
            <Image
              src={YMHLogo}
              alt="YMH Logo"
              width={200}
              height={100}
              priority
              className="rounded-lg"
            />
            <h1 className="text-xl text-center font-semibold text-gray-900">
              What If 2025 Bar
            </h1>
          </a>
        </div>

        {session && (
          <nav className="flex space-x-8">
            <Link
              href="/dashboard"
              className={`text-sm font-medium ${
                pathname === "/dashboard"
                  ? "text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/items"
              className={`text-sm font-medium ${
                pathname === "/items"
                  ? "text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Item Sign Up
            </Link>
            <Link
              href="/shifts"
              className={`text-sm font-medium ${
                pathname === "/shifts"
                  ? "text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Shift Sign Up
            </Link>
          </nav>
        )}

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
