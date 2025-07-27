"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import YMHLogo from "../app/assets/YMH.jpg";
import { useSession } from "@/context/SessionContext";

export default function Header() {
  const { session, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", title: "Dashboard" },
    { href: "/items", label: "Item Sign Up", title: "Items" },
    { href: "/shifts", label: "Shift Sign Up", title: "Shifts" },
  ];

  const currentPage = navLinks.find((link) => link.href === pathname);

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <a
              href="/dashboard"
              className="flex flex-col items-center sm:items-start"
            >
              <Image
                src={YMHLogo}
                alt="YMH Logo"

                height={75}
                priority
                className="rounded-lg"
              />
              <h2 className="text-lg sm:text-xl mt-2 font-semibold text-gray-900">
                What If 2025 Bar
              </h2>
            </a>
          </div>

          {currentPage && (
            <div className="flex-1 flex justify-center">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {currentPage.title}
              </h1>
            </div>
          )}

          {session && (
            <div className="flex-shrink-0 flex items-center">
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium ${
                      pathname === link.href
                        ? "text-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign Out
                </button>
              </nav>

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMenu}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Open menu</span>
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Navigation */}
        {session && isMenuOpen && (
          <nav className="md:hidden mt-4 py-3 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-base font-medium ${
                    pathname === link.href
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  signOut();
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Out
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
