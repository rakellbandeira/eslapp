"use client";

import { useState, useEffect } from "react";

interface DefaultBookingEntry {
  _id: string;
  dayOfWeek: number;
  time: string;
  teacherId: string;
}

interface MeetingLink {
  url: string;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const primaryDark = "#7B5EA7";
const danger = "#E57373";
const cardStyle = { backgroundColor: "#FFFFFF", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" };

export default function MyDefaultsPage() {
  const [defaults, setDefaults] = useState<DefaultBookingEntry[]>([]);
  const [meetingLink, setMeetingLink] = useState<MeetingLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    const [defaultsRes, linkRes] = await Promise.all([
      fetch("/api/default-bookings"),
      fetch("/api/meeting-links"),
    ]);
    const defaultsData = await defaultsRes.json();
    const linkData = await linkRes.json();
    setDefaults(Array.isArray(defaultsData) ? defaultsData : []);
    setMeetingLink(linkData && linkData.url ? linkData : null);
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

  if (isLoading) {
    return <p className="px-4 py-12 text-gray-400">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold" style={{ color: "#1A202C" }}>
        My Weekly Classes
      </h1>
      <p className="mb-8 text-gray-500">
        These are your standing class times — they repeat every week automatically. To add a
        new default time, go to{" "}
        <a href="/schedule" className="underline" style={{ color: primaryDark }}>
          Schedule
        </a>{" "}
        and click "Set as default" on any open slot.
      </p>

      {/* ── Standing defaults ── */}
      {defaults.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={cardStyle}>
          <p className="text-lg font-medium text-gray-500">No standing classes yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Go to Schedule and click "Set as default" on an available time slot.
          </p>
          <a
            href="/schedule"
            className="mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryDark }}
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
              style={cardStyle}
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
                style={{ backgroundColor: danger }}
              >
                {cancelling === d._id ? "Cancelling..." : "Cancel this default"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Video call link ── */}
      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold" style={{ color: "#1A202C" }}>
          My Class Link
        </h2>
        {meetingLink ? (
          <div className="rounded-xl px-6 py-5" style={cardStyle}>
            <p className="mb-3 text-sm text-gray-500">
              Your teacher has shared this link for your online classes:
            </p>
            <a
              href={meetingLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryDark }}
            >
              Join class →
            </a>
            <p className="mt-3 break-all text-xs text-gray-400">{meetingLink.url}</p>
          </div>
        ) : (
          <div className="rounded-xl px-6 py-5" style={cardStyle}>
            <p className="text-sm text-gray-400">
              Your teacher has not shared a class link yet. Check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
