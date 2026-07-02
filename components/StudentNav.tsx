"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/my-defaults", label: "My Classes" },
];

export default function StudentNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <nav style={{ backgroundColor: "#9370BE" }}>
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-xl font-bold text-white tracking-tight">
          ESL Pals
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-opacity ${
                pathname === link.href
                  ? "text-white opacity-100 underline underline-offset-4"
                  : "text-white opacity-80 hover:opacity-100"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1 text-sm font-medium text-white opacity-80 hover:opacity-100"
            >
              {userName}
              <span className="text-xs">{profileOpen ? "▲" : "▼"}</span>
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 top-8 z-50 w-48 rounded-xl py-2 shadow-lg"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <Link
                  href="/account"
                  onClick={() => setProfileOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Change credentials
                </Link>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col items-center justify-center gap-1.5 md:hidden"
          aria-label="Toggle menu"
        >
          <span className={`block h-0.5 w-6 bg-white transition-transform duration-200 ${isOpen ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-opacity duration-200 ${isOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-transform duration-200 ${isOpen ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="border-t border-white/20 px-6 pb-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`block py-3 text-sm font-medium transition-opacity ${
                pathname === link.href ? "text-white opacity-100" : "text-white opacity-80 hover:opacity-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/account"
            onClick={() => setIsOpen(false)}
            className="block py-3 text-sm font-medium text-white opacity-80 hover:opacity-100"
          >
            Change credentials
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block py-3 text-sm font-medium text-white opacity-80 hover:opacity-100"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}