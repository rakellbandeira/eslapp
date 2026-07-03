"use client";

import { useState, useEffect } from "react";

interface Slot {
  _id: string;
  startTime: string;
  endTime: string;
  status: "open" | "booked" | "deactivated";
  // bookedBy is now an object (populated) or a plain string id — handle both
  bookedBy?: { _id: string; name: string; email: string } | string;
  isDefaultBooking: boolean;
}

interface DefaultBookingEntry {
  _id: string;
  dayOfWeek: number;
  time: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Extract the bookedBy ID regardless of whether it's a populated object or a plain string
function getBookedById(bookedBy: Slot["bookedBy"]): string | null {
  if (!bookedBy) return null;
  if (typeof bookedBy === "string") return bookedBy;
  return bookedBy._id;
}

export default function SchedulePage() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [monthSlots, setMonthSlots] = useState<Slot[]>([]);
  const [myDefaults, setMyDefaults] = useState<DefaultBookingEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSlotId, setActionSlotId] = useState<string | null>(null);
  const [swappingFromSlotId, setSwappingFromSlotId] = useState<string | null>(null);

  async function loadData(month: Date) {
    setIsLoading(true);

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    setMyUserId(session?.user?.id || null);

    const enrollmentsRes = await fetch("/api/enrollments");
    const enrollments = await enrollmentsRes.json();
    const resolvedTeacherId = enrollments[0]?.courseId?.teacherId;
    setTeacherId(resolvedTeacherId || null);

    if (!resolvedTeacherId) {
      setIsLoading(false);
      return;
    }

    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

    const [slotsRes, defaultsRes] = await Promise.all([
      fetch(
        `/api/availability?teacherId=${resolvedTeacherId}&from=${monthStart.toISOString()}&to=${monthEnd.toISOString()}`
      ),
      fetch("/api/default-bookings"),
    ]);

    setMonthSlots(await slotsRes.json());
    setMyDefaults(await defaultsRes.json());
    setIsLoading(false);
  }

  useEffect(() => {
    loadData(viewMonth);
  }, [viewMonth]);

  function slotsForDate(date: Date) {
    return monthSlots
      .filter((s) => {
        const slotDate = new Date(s.startTime);
        // Compare using UTC values — slots are stored as UTC timestamps
        // and the calendar grid days are local, but since we use Date.UTC
        // in generation, the UTC date IS the intended calendar date
        return (
          slotDate.getUTCDate() === date.getDate() &&
          slotDate.getUTCMonth() === date.getMonth() &&
          slotDate.getUTCFullYear() === date.getFullYear() &&
          s.status !== "deactivated"
        );
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  function isMyDefaultDay(date: Date) {
    return myDefaults.some((d) => d.dayOfWeek === date.getDay());
  }

  async function bookSlotDirectly(slotId: string, markAsDefaultFlag: boolean) {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, isDefaultBooking: markAsDefaultFlag }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Could not book.");
    }
    return data;
  }

  async function handleBookOpen(slot: Slot) {
    setError("");
    setActionSlotId(slot._id);

    try {
      if (swappingFromSlotId) {
        const res = await fetch(`/api/bookings/${swappingFromSlotId}/swap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newSlotId: slot._id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not swap.");
        setSwappingFromSlotId(null);
      } else {
        await bookSlotDirectly(slot._id, false);
      }
      setActionSlotId(null);
      loadData(viewMonth);
    } catch (err: any) {
      setError(err.message);
      setActionSlotId(null);
    }
  }

  async function handleSetAsDefault(slot: Slot) {
    setError("");
    setActionSlotId(slot._id);

    try {
      const slotDate = new Date(slot.startTime);
      // FIX: use UTC hours/minutes — slots are stored in UTC, so the
      // intended time is in UTC, not the local timezone
      const time = `${String(slotDate.getUTCHours()).padStart(2, "0")}:${String(
        slotDate.getUTCMinutes()
      ).padStart(2, "0")}`;
      const dayOfWeek = slotDate.getUTCDay();

      const defaultRes = await fetch("/api/default-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, dayOfWeek, time }),
      });
      const defaultData = await defaultRes.json();
      if (!defaultRes.ok) {
        throw new Error(defaultData.error || "Could not set default.");
      }

      await bookSlotDirectly(slot._id, true);

      setActionSlotId(null);
      loadData(viewMonth);
    } catch (err: any) {
      setError(err.message);
      setActionSlotId(null);
    }
  }

  async function handleCancelMine(slot: Slot) {
    setActionSlotId(slot._id);
    await fetch(`/api/bookings/${slot._id}`, { method: "DELETE" });
    setActionSlotId(null);
    loadData(viewMonth);
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading calendar...</p>;

  if (!teacherId) {
    return (
      <p className="p-8 text-gray-500">
        No teacher found. Make sure you're enrolled in a course.
      </p>
    );
  }

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const days: (Date | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)
    ),
  ];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Schedule a Class</h1>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {swappingFromSlotId && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-blue-50 px-3 py-2">
          <span className="text-sm text-blue-800">Pick a new time to swap into.</span>
          <button
            onClick={() => setSwappingFromSlotId(null)}
            className="text-sm text-blue-600 hover:underline"
          >
            Cancel swap
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="rounded-md border border-purple-300 px-3 py-1 text-sm hover:bg-purple-50"
        >
          ← Prev
        </button>
        <h2 className="font-medium text-gray-900">
          {viewMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="rounded-md border border-purple-300 px-3 py-1 text-sm hover:bg-purple-50"
        >
          Next →
        </button>
      </div>

      <div className="mb-6 grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
        {days.map((date, index) => {
          if (!date) return <div key={index} />;

          const daySlots = slotsForDate(date);
          const hasOpen = daySlots.some((s) => s.status === "open");
          // FIX: use getBookedById() to handle both populated object and plain string
          const hasMine = daySlots.some((s) => getBookedById(s.bookedBy) === myUserId);
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
          const isSelected =
            !!selectedDate &&
            selectedDate.getDate() === date.getDate() &&
            selectedDate.getMonth() === date.getMonth() &&
            selectedDate.getFullYear() === date.getFullYear();

          return (
            <button
              key={index}
              disabled={isPast || daySlots.length === 0}
              onClick={() => setSelectedDate(date)}
              className={`rounded-md p-2 text-sm transition-colors ${
                isPast || daySlots.length === 0
                  ? "cursor-not-allowed text-gray-300"
                  : isSelected
                  ? "bg-blue-600 text-white"
                  : hasMine
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : hasOpen
                  ? "bg-blue-50 text-blue-800 hover:bg-blue-100"
                  : "bg-gray-50 text-gray-400"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div>
          <h3 className="mb-3 font-medium text-gray-900">
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>

          <ul className="space-y-2">
            {slotsForDate(selectedDate).map((slot) => {
              // FIX: compare using the extracted ID, not direct equality with object
              const isMine = getBookedById(slot.bookedBy) === myUserId;
              const isOpen = slot.status === "open";
              // FIX: use UTC hours for display — stored time IS the intended time in UTC
              const timeLabel = new Date(slot.startTime).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "UTC",
              });

              return (
                <li
                  key={slot._id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{timeLabel}</span>
                    {slot.isDefaultBooking && isMine && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Your default
                      </span>
                    )}
                  </div>

                  {isMine ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSwappingFromSlotId(slot._id)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Move this class
                      </button>
                      <button
                        onClick={() => handleCancelMine(slot)}
                        disabled={actionSlotId === slot._id}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : isOpen ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBookOpen(slot)}
                        disabled={actionSlotId === slot._id}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {swappingFromSlotId ? "Move here" : "Book"}
                      </button>
                      {!swappingFromSlotId && !isMyDefaultDay(selectedDate) && (
                        <button
                          onClick={() => handleSetAsDefault(slot)}
                          disabled={actionSlotId === slot._id}
                          className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        >
                          Set as default
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Taken</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
