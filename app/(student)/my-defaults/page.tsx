"use client";

import { useState, useEffect } from "react";

interface DefaultBookingEntry {
  _id: string;
  dayOfWeek: number;
  time: string;
  teacherId: string;
}

interface ExtraBooking {
  _id: string;
  startTime: string;
  endTime: string;
  isDefaultBooking: boolean;
  teacherId: { name: string; email: string } | string;
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
const accent = "#3DB89A";
const danger = "#E57373";
const cardStyle = { backgroundColor: "#FFFFFF", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" };

export default function MyDefaultsPage() {
  const [defaults, setDefaults] = useState<DefaultBookingEntry[]>([]);
  const [extraBookings, setExtraBookings] = useState<ExtraBooking[]>([]);
  const [meetingLink, setMeetingLink] = useState<MeetingLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancellingExtra, setCancellingExtra] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    const [defaultsRes, bookingsRes, linkRes] = await Promise.all([
      fetch("/api/default-bookings"),
      fetch("/api/bookings"),
      fetch("/api/meeting-links"),
    ]);
    const defaultsData = await defaultsRes.json();
    const bookingsData = await bookingsRes.json();
    const linkData = await linkRes.json();

    setDefaults(Array.isArray(defaultsData) ? defaultsData : []);

    // Filter to only non-default (one-off) future bookings
    const now = new Date();
    const extras = Array.isArray(bookingsData)
      ? bookingsData.filter(
          (b: ExtraBooking) =>
            !b.isDefaultBooking && new Date(b.startTime) >= now
        )
      : [];
    setExtraBookings(extras);

    setMeetingLink(linkData && linkData.url ? linkData : null);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancelDefault(id: string) {
    setCancelling(id);
    await fetch(`/api/default-bookings/${id}`, { method: "DELETE" });
    setCancelling(null);
    load();
  }

  async function handleCancelExtra(slotId: string) {
    const confirmed = window.confirm(
      "Cancel this booking? The slot will become available to other students."
    );
    if (!confirmed) return;
    setCancellingExtra(slotId);
    await fetch(`/api/bookings/${slotId}`, { method: "DELETE" });
    setCancellingExtra(null);
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        My standing weekly time
      </h2>
      {defaults.length === 0 ? (
        <div className="mb-8 rounded-xl p-8 text-center" style={cardStyle}>
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
        <ul className="mb-8 space-y-3">
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
                onClick={() => handleCancelDefault(d._id)}
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

      {/* ── Extra one-off bookings ── */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Extra booked classes
      </h2>
      {extraBookings.length === 0 ? (
        <div className="mb-8 rounded-xl px-6 py-4" style={cardStyle}>
          <p className="text-sm text-gray-400">
            No extra classes booked. You can book a one-off class from the{" "}
            <a href="/schedule" className="underline" style={{ color: primaryDark }}>
              Schedule
            </a>{" "}
            page.
          </p>
        </div>
      ) : (
        <ul className="mb-8 space-y-3">
          {extraBookings.map((b) => (
            <li
              key={b._id}
              className="flex items-center justify-between rounded-xl px-6 py-4"
              style={{
                ...cardStyle,
                borderLeft: `4px solid ${accent}`,
              }}
            >
              <div>
                <p className="font-semibold" style={{ color: "#1A202C" }}>
                  {new Date(b.startTime).toLocaleString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-gray-400">
                  Until{" "}
                  {new Date(b.endTime).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => handleCancelExtra(b._id)}
                disabled={cancellingExtra === b._id}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: danger }}
              >
                {cancellingExtra === b._id ? "Cancelling..." : "Cancel"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Video call link ── */}
      <div className="mt-4">
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
