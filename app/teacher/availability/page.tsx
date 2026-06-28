"use client";

import { useState, useEffect } from "react";

interface Slot {
  _id: string;
  startTime: string;
  endTime: string;
  status: "open" | "booked";
  bookedBy?: { name: string; email: string } | string;
}

export default function TeacherAvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        setTeacherId(session?.user?.id || null);
      });
  }, []);

  async function loadSlots(forTeacherId: string) {
    setIsLoading(true);
    const today = new Date();
    const fourWeeksOut = new Date();
    fourWeeksOut.setDate(today.getDate() + 28);

    const res = await fetch(
      `/api/availability?teacherId=${forTeacherId}&from=${today.toISOString()}&to=${fourWeeksOut.toISOString()}`
    );
    const data = await res.json();
    setSlots(data);
    setIsLoading(false);
  }

  useEffect(() => {
    if (teacherId) loadSlots(teacherId);
  }, [teacherId]);

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not create slot.");
      setIsSubmitting(false);
      return;
    }

    setStartTime("");
    setEndTime("");
    setIsSubmitting(false);
    if (teacherId) loadSlots(teacherId);
  }

  async function handleDeleteSlot(slotId: string) {
    await fetch(`/api/availability/${slotId}`, { method: "DELETE" });
    if (teacherId) loadSlots(teacherId);
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">My Availability</h1>

      <form onSubmit={handleCreateSlot} className="mb-8 space-y-3 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-medium text-gray-900">Add a time slot</h2>
        <div className="flex gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add slot"}
        </button>
      </form>

      <h2 className="mb-3 text-lg font-medium text-gray-900">Upcoming slots</h2>

      {slots.length === 0 ? (
        <p className="text-gray-500">No slots added yet.</p>
      ) : (
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li
              key={slot._id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
            >
              <div>
                <p className="text-sm text-gray-900">
                  {new Date(slot.startTime).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(slot.endTime).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {slot.status === "booked" && typeof slot.bookedBy === "object" && (
                  <p className="text-xs text-gray-500">Booked by {slot.bookedBy.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    slot.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {slot.status === "open" ? "Open" : "Booked"}
                </span>
                {slot.status === "open" && (
                  <button
                    onClick={() => handleDeleteSlot(slot._id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}