"use client";

import { useState, useEffect } from "react";

interface Rule {
  _id: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  ruleEndDate: string;
  isActive: boolean;
}

interface DefaultBookingEntry {
  _id: string;
  studentId: { name: string; email: string };
  dayOfWeek: number;
  time: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TeacherAvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [defaults, setDefaults] = useState<DefaultBookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("20:00");
  const [duration, setDuration] = useState(60);
  const [monthsOut, setMonthsOut] = useState(12);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allSlots, setAllSlots] = useState<any[]>([]);

  async function loadData() {
    setIsLoading(true);
    const today = new Date();
    const fourWeeksOut = new Date();
    fourWeeksOut.setDate(today.getDate() + 28);

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const teacherId = session?.user?.id;

    const [rulesRes, defaultsRes, slotsRes] = await Promise.all([
        fetch("/api/availability-rules"),
        fetch("/api/default-bookings"),
        fetch(`/api/availability?teacherId=${teacherId}&from=${today.toISOString()}&to=${fourWeeksOut.toISOString()}`),
    ]);
    setRules(await rulesRes.json());
    setDefaults(await defaultsRes.json());
    setAllSlots(await slotsRes.json());
    setIsLoading(false);
}

  useEffect(() => {
    loadData();
  }, []);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const ruleStartDate = new Date();
    const ruleEndDate = new Date();
    ruleEndDate.setMonth(ruleEndDate.getMonth() + monthsOut);

    const res = await fetch("/api/availability-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        daysOfWeek: selectedDays,
        startTime,
        endTime,
        slotDurationMinutes: duration,
        ruleStartDate: ruleStartDate.toISOString(),
        ruleEndDate: ruleEndDate.toISOString(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not create rule.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    loadData();
  }

  async function toggleRuleActive(rule: Rule) {
    await fetch(`/api/availability-rules/${rule._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    loadData();
  }

  async function cancelDefault(defaultId: string) {
    await fetch(`/api/default-bookings/${defaultId}`, { method: "DELETE" });
    loadData();
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">My Availability</h1>

      <form onSubmit={handleCreateRule} className="mb-8 space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-medium text-gray-900">Set a recurring weekly pattern</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Days of week</label>
          <div className="flex gap-1">
            {DAY_NAMES.map((name, index) => (
              <button
                key={index}
                type="button"
                onClick={() => toggleDay(index)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                  selectedDays.includes(index)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">From</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Class length (min)</label>
            <input
              type="number"
              min={15}
              step={15}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Repeat for how many months?</label>
          <input
            type="number"
            min={1}
            max={24}
            value={monthsOut}
            onChange={(e) => setMonthsOut(parseInt(e.target.value) || 12)}
            className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create recurring pattern"}
        </button>
      </form>

      <h2 className="mb-3 text-lg font-medium text-gray-900">Active patterns</h2>
      {rules.length === 0 ? (
        <p className="mb-8 text-gray-500">No recurring patterns yet.</p>
      ) : (
        <ul className="mb-8 space-y-2">
          {rules.map((rule) => (
            <li
              key={rule._id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
            >
              <p className="text-sm text-gray-900">
                {rule.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")} · {rule.startTime}–{rule.endTime} ·{" "}
                {rule.slotDurationMinutes}min classes
              </p>
              <button
                onClick={() => toggleRuleActive(rule)}
                className={`text-sm ${rule.isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
              >
                {rule.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-lg font-medium text-gray-900">Students' standing weekly classes</h2>

      <h2 className="mb-3 mt-8 text-lg font-medium text-gray-900">Upcoming bookings (next 4 weeks)</h2>
        {allSlots.filter((s) => s.status === "booked").length === 0 ? (
        <p className="text-gray-500">No bookings yet.</p>
        ) : (
        <ul className="space-y-2">
            {allSlots
            .filter((s) => s.status === "booked")
            .map((s) => (
                <li
                key={s._id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                >
                <p className="text-sm text-gray-900">
                    {new Date(s.startTime).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    })}
                </p>
                {s.isDefaultBooking && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Standing default
                    </span>
                )}
                </li>
            ))}
        </ul>
        )}

      {defaults.length === 0 ? (
        <p className="text-gray-500">No students have set a default time yet.</p>
      ) : (
        <ul className="space-y-2">
          {defaults.map((d) => (
            <li
              key={d._id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
            >
              <p className="text-sm text-gray-900">
                {d.studentId?.name} — {DAY_NAMES[d.dayOfWeek]} at {d.time}
              </p>
              <button
                onClick={() => cancelDefault(d._id)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}