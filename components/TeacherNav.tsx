"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_LINKS = [
  { href: "/teacher/courses", label: "Courses" },
  { href: "/teacher/students", label: "Students" },
  { href: "/teacher/availability", label: "Availability" },
];

export default function TeacherNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center justify-between px-8 py-4"
      style={{ backgroundColor: "#9370BE" }}
    >
      <Link href="/teacher/courses" className="text-xl font-bold text-white tracking-tight">
        ESL Pals <span className="text-sm font-normal opacity-75">· Teacher</span>
      </Link>

      <div className="flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-opacity ${
              pathname?.startsWith(link.href)
                ? "text-white opacity-100 underline underline-offset-4"
                : "text-white opacity-80 hover:opacity-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm font-medium text-white opacity-80 hover:opacity-100"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}