import Link from "next/link";
import { theme } from "@/lib/theme";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: theme.background }}>
      <nav
        className="flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: theme.primary }}
      >
        <span className="text-xl font-bold text-white tracking-tight">ESL Pals</span>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-white opacity-90 hover:opacity-100">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#FFFFFF", color: theme.primaryDark }}
          >
            Sign up
          </Link>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1
          className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl"
          style={{ color: theme.textDark }}
        >
          Learn English at your own pace, with a teacher who knows your name.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-gray-500">
          Lessons, quizzes, and live classes, all in one place. Built for students who want
          real progress, not just another app.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/register"
            className="rounded-lg px-6 py-3 text-base font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: theme.accent }}
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-6 py-3 text-base font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#FFFFFF", color: theme.primaryDark, border: `1px solid ${theme.primary}` }}
          >
            Log in
          </Link>
        </div>

        <div className="mt-20 grid max-w-3xl gap-6 sm:grid-cols-3">
          <div
            className="rounded-xl p-6 text-left"
            style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
          >
            <h3 className="font-semibold" style={{ color: theme.primaryDark }}>
              Your own lessons
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Work through pages, quizzes, and exercises built for you, at your own speed.
            </p>
          </div>
          <div
            className="rounded-xl p-6 text-left"
            style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
          >
            <h3 className="font-semibold" style={{ color: theme.primaryDark }}>
              Live classes
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Book a weekly time that works for you, or pick a new one whenever you need to.
            </p>
          </div>
          <div
            className="rounded-xl p-6 text-left"
            style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
          >
            <h3 className="font-semibold" style={{ color: theme.primaryDark }}>
              Track your progress
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              See exactly what you've finished and how you're doing, every step of the way.
            </p>
          </div>
        </div>
      </main>

      <footer
        className="mt-auto py-6 text-center text-sm text-gray-300"
        style={{ backgroundColor: theme.footerDark }}
      >
        © 2026 ESL Pals. All rights reserved.
      </footer>
    </div>
  );
}