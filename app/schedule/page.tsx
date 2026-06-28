"use client";

import { useState, useEffect } from "react";

interface Slot {
  _id: string;
  teacherId: string;
  startTime: string;
  endTime: string;
  status: "open" | "booked";
}

interface MyBooking {
  _id: string;
  startTime: string;
  endTime: string;
  teacherId: { name: string; email: string };
}

export default function SchedulePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  async function loadData() {
  setIsLoading(true);

  // Find the teacher via this student's enrollments, not via published courses —
  // a student should see their teacher's schedule regardless of course publish state.
  const enrollmentsRes = await fetch("/api/enrollments");
  const enrollments = await enrollmentsRes.json();
  const teacherId = enrollments[0]?.courseId?.teacherId;

  if (!teacherId) {
    setIsLoading(false);
    return;
  }

  const today = new Date();
  const fourWeeksOut = new Date();
  fourWeeksOut.setDate(today.getDate() + 28);

  const [slotsRes, bookingsRes] = await Promise.all([
    fetch(`/api/availability?teacherId=${teacherId}&from=${today.toISOString()}&to=${fourWeeksOut.toISOString()}`),
    fetch("/api/bookings"),
  ]);

  setSlots(await slotsRes.json());
  setMyBookings(await bookingsRes.json());
  setIsLoading(false);
}

  useEffect(() => {
    loadData();
  }, []);

  async function handleBook(slotId: string) {
    setError("");
    setBookingSlotId(slotId);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not book this slot.");
      setBookingSlotId(null);
      loadData(); // refresh, since the slot may have just been taken by someone else
      return;
    }

    setBookingSlotId(null);
    loadData();
  }

  async function handleCancel(slotId: string) {
    await fetch(`/api/bookings/${slotId}`, { method: "DELETE" });
    loadData();
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  const openSlots = slots.filter((s) => s.status === "open");

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Schedule a Class</h1>

      {myBookings.length > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-2 text-sm font-medium text-blue-900">Your upcoming class</h2>
          {myBookings.map((b) => (
            <div key={b._id} className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                {new Date(b.startTime).toLocaleString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                with {b.teacherId?.name}
              </p>
              <button
                onClick={() => handleCancel(b._id)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <h2 className="mb-3 text-lg font-medium text-gray-900">Available times</h2>

      {openSlots.length === 0 ? (
        <p className="text-gray-500">No open slots right now. Check back soon.</p>
      ) : (
        <ul className="space-y-2">
          {openSlots.map((slot) => (
            <li
              key={slot._id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
            >
              <p className="text-sm text-gray-900">
                {new Date(slot.startTime).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <button
                onClick={() => handleBook(slot._id)}
                disabled={bookingSlotId === slot._id || myBookings.length > 0}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {bookingSlotId === slot._id ? "Booking..." : "Book"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}