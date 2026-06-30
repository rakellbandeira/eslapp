"use client";

import { useState, useEffect } from "react";

interface DefaultBookingEntry {
  _id: string;
  dayOfWeek: number;
  time: string;
  teacherId: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function MyDefaultsPage() {
  const [defaults, setDefaults] = useState<DefaultBookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    const res = await fetch("/api/default-bookings");
    const data = await res.json();
    setDefaults(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(id: string) {
    setCancelling(id);
    await fetch(`/api/default-bookings/${id}`, { method: "DELETE" });
    setCancelling(null);
    load();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1
        className="mb-2 text-3xl font-bold"
        style={{ color: "#1A202C" }}
      >
        My Weekly Classes
      </h1>
      <p className="mb-8 text-gray-500">
        These are your standing class times — they repeat every week automatically.
        To add a new default time, go to{" "}
        <a href="/schedule" className="underline" style={{ color: "#7B5EA7" }}>
          Schedule
        </a>{" "}
        and click "Set as default" on any open slot.
      </p>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : defaults.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "#FFFFFF", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
        >
          <p className="text-lg font-medium text-gray-500">No standing classes yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Go to Schedule and click "Set as default" on an available time slot.
          </p>
          <a
            href="/schedule"
            className="mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#7B5EA7" }}
          >
            Go to Schedule
          </a>
        </div>
      ) : (
        <ul className="space-y-3">
          {defaults.map((d) => (
            <li
              key={d._id}
              className="flex items-center justify-between rounded-xl px-6 py-4"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <div>
                <p className="font-semibold" style={{ color: "#1A202C" }}>
                  {DAY_NAMES[d.dayOfWeek]}s at {d.time}
                </p>
                <p className="text-sm text-gray-400">Repeats weekly</p>
              </div>
              <button
                onClick={() => handleCancel(d._id)}
                disabled={cancelling === d._id}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#E57373" }}
              >
                {cancelling === d._id ? "Cancelling..." : "Cancel this default"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}