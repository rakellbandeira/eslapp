"use client";

import { useState, useEffect } from "react";
import { theme } from "@/lib/theme";

interface Rule {
  _id: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
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
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("20:00");
  const [duration, setDuration] = useState(60);
  const [monthsOut, setMonthsOut] = useState(12);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (isLoading) return <p className="px-4 py-12 text-gray-400">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold" style={{ color: theme.textDark }}>
        My Availability
      </h1>

      <form
        onSubmit={handleCreateRule}
        className="mb-8 space-y-4 rounded-xl p-6"
        style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
      >
        <h2 className="font-semibold" style={{ color: theme.primaryDark }}>
          Set a recurring weekly pattern
        </h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Days of week</label>
          <div className="flex gap-1">
            {DAY_NAMES.map((name, index) => (
              <button
                key={index}
                type="button"
                onClick={() => toggleDay(index)}
                className="rounded-lg px-2 py-1.5 text-xs font-medium transition-opacity"
                style={
                  selectedDays.includes(index)
                    ? { backgroundColor: theme.primaryDark, color: "#fff" }
                    : { backgroundColor: "#F1F1F1", color: "#888" }
                }
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
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
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
              className="mt-1 w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
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
            className="mt-1 w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: theme.accent }}
        >
          {isSubmitting ? "Creating..." : "Create recurring pattern"}
        </button>
      </form>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Active patterns
      </h2>
      {rules.length === 0 ? (
        <p className="mb-8 text-gray-400">No recurring patterns yet.</p>
      ) : (
        <ul className="mb-8 space-y-2">
          {rules.map((rule) => (
            <li
              key={rule._id}
              className="flex items-center justify-between rounded-xl p-4"
              style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
            >
              <p className="text-sm" style={{ color: theme.textDark }}>
                {rule.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")} · {rule.startTime}–{rule.endTime} ·{" "}
                {rule.slotDurationMinutes}min classes
              </p>
              <button
                onClick={() => toggleRuleActive(rule)}
                className="text-sm font-medium"
                style={{ color: rule.isActive ? theme.danger : theme.accent }}
              >
                {rule.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Students' standing weekly classes
      </h2>
      {defaults.length === 0 ? (
        <p className="mb-8 text-gray-400">No students have set a default time yet.</p>
      ) : (
        <ul className="mb-8 space-y-2">
          {defaults.map((d) => (
            <li
              key={d._id}
              className="flex items-center justify-between rounded-xl p-4"
              style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
            >
              <p className="text-sm" style={{ color: theme.textDark }}>
                {d.studentId?.name} — {DAY_NAMES[d.dayOfWeek]} at {d.time}
              </p>
              <button
                onClick={() => cancelDefault(d._id)}
                className="text-sm font-medium"
                style={{ color: theme.danger }}
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Upcoming bookings (next 4 weeks)
      </h2>
      {allSlots.filter((s) => s.status === "booked").length === 0 ? (
        <p className="text-gray-400">No bookings yet.</p>
      ) : (
        <ul className="space-y-2">
          {allSlots
            .filter((s) => s.status === "booked")
            .map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between rounded-xl p-4"
                style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
              >
                <p className="text-sm" style={{ color: theme.textDark }}>
                  {new Date(s.startTime).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {s.isDefaultBooking && (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: "#DEF7EC", color: theme.accent }}
                  >
                    Standing default
                  </span>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}