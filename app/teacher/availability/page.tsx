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
  studentId: { _id: string; name: string; email: string };
  dayOfWeek: number;
  time: string;
}

interface BookedSlot {
  _id: string;
  startTime: string;
  status: string;
  isDefaultBooking: boolean;
  bookedBy?: { _id: string; name: string; email: string };
}

interface MeetingLink {
  _id: string;
  studentId: { _id: string; name: string; email: string };
  url: string;
}

interface StudentEntry {
  _id: string;
  name: string;
  email: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const cardStyle = {
  backgroundColor: "#FFFFFF",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

export default function TeacherAvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [defaults, setDefaults] = useState<DefaultBookingEntry[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [meetingLinks, setMeetingLinks] = useState<MeetingLink[]>([]);
  const [allStudents, setAllStudents] = useState<StudentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("20:00");
  const [duration, setDuration] = useState(60);
  const [monthsOut, setMonthsOut] = useState(12);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingLinkStudentId, setEditingLinkStudentId] = useState<string | null>(null);
  const [editingLinkUrl, setEditingLinkUrl] = useState("");
  const [newLinkStudentId, setNewLinkStudentId] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  async function loadData() {
    setIsLoading(true);

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const tid = session?.user?.id;

    const today = new Date();
    const oneYearOut = new Date();
    oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

    const [rulesRes, defaultsRes, slotsRes, linksRes] = await Promise.all([
      fetch("/api/availability-rules").catch(() => null),
      fetch("/api/default-bookings").catch(() => null),
      fetch(`/api/availability?teacherId=${tid}&from=${today.toISOString()}&to=${oneYearOut.toISOString()}`).catch(() => null),
      fetch("/api/meeting-links").catch(() => null),
    ]);

    const rulesData: Rule[] = rulesRes?.ok ? await rulesRes.json() : [];
    const defaultsData: DefaultBookingEntry[] = defaultsRes?.ok ? await defaultsRes.json() : [];
    const allSlots: BookedSlot[] = slotsRes?.ok ? await slotsRes.json() : [];
    const linksData: MeetingLink[] = linksRes?.ok ? await linksRes.json() : [];

    setRules(rulesData);
    setDefaults(defaultsData);
    setBookedSlots(allSlots.filter((s) => s.status === "booked"));
    setMeetingLinks(linksData);

    const studentMap = new Map<string, StudentEntry>();
    defaultsData.forEach((d) => {
      if (d.studentId?._id) studentMap.set(d.studentId._id, d.studentId);
    });
    allSlots.forEach((s) => {
      if (s.bookedBy?._id) studentMap.set(s.bookedBy._id, s.bookedBy);
    });
    setAllStudents(Array.from(studentMap.values()));

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

  async function cancelBooking(slotId: string) {
    const confirmed = window.confirm("Cancel this booking? The slot will become available again.");
    if (!confirmed) return;
    await fetch(`/api/bookings/${slotId}`, { method: "DELETE" });
    loadData();
  }

  async function saveMeetingLink(studentId: string, url: string) {
    if (!url.trim()) return;
    await fetch("/api/meeting-links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, url: url.trim() }),
    });
    setEditingLinkStudentId(null);
    setNewLinkStudentId("");
    setNewLinkUrl("");
    loadData();
  }

  const studentsWithoutLink = allStudents.filter(
    (s) => !meetingLinks.some((l) => l.studentId._id === s._id)
  );

  if (isLoading) return <p className="px-4 py-12 text-gray-400">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold" style={{ color: theme.textDark }}>
        My Availability
      </h1>

      {/* ── Create recurring pattern ── */}
      <form
        onSubmit={handleCreateRule}
        className="mb-8 space-y-4 rounded-xl p-6"
        style={cardStyle}
      >
        <h2 className="font-semibold" style={{ color: theme.primaryDark }}>
          Set a recurring weekly pattern
        </h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Days of week</label>
          <div className="flex flex-wrap gap-1">
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

        <div className="flex flex-wrap gap-3">
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

      {/* ── Active patterns ── */}
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
              style={cardStyle}
            >
              <p className="text-sm" style={{ color: theme.textDark }}>
                {rule.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")} · {rule.startTime}–{rule.endTime} · {rule.slotDurationMinutes}min classes
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

      {/* ── Students' standing weekly classes ── */}
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
              style={cardStyle}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: theme.textDark }}>
                  {d.studentId?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {DAY_NAMES[d.dayOfWeek]}s at {d.time}
                </p>
              </div>
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


      {/* ── Student video call links ── */}
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Student video call links
      </h2>
      <div className="mb-8 rounded-xl p-6 space-y-4" style={cardStyle}>
        <p className="text-xs text-gray-500">
          Assign a personal video call link for each student. They will see it in their "My Classes" page.
        </p>

        {meetingLinks.length > 0 && (
          <ul className="space-y-3">
            {meetingLinks.map((link) => (
              <li key={link._id}>
                {editingLinkStudentId === link.studentId._id ? (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editingLinkUrl}
                      onChange={(e) => setEditingLinkUrl(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      autoFocus
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                    />
                    <button
                      onClick={() => saveMeetingLink(link.studentId._id, editingLinkUrl)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                      style={{ backgroundColor: theme.accent }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingLinkStudentId(null)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: theme.textDark }}>
                        {link.studentId.name}
                      </p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-xs hover:underline"
                        style={{ color: theme.primaryDark }}
                      >
                        {link.url}
                      </a>
                    </div>
                    <button
                      onClick={() => {
                        setEditingLinkStudentId(link.studentId._id);
                        setEditingLinkUrl(link.url);
                      }}
                      className="shrink-0 text-sm font-medium"
                      style={{ color: theme.primaryDark }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {studentsWithoutLink.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-medium text-gray-600">Add link for a student:</p>
            <div className="flex flex-wrap gap-2">
              <select
                value={newLinkStudentId}
                onChange={(e) => setNewLinkStudentId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none"
              >
                <option value="">Select student...</option>
                {studentsWithoutLink.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (newLinkStudentId && newLinkUrl) {
                    saveMeetingLink(newLinkStudentId, newLinkUrl);
                  }
                }}
                disabled={!newLinkStudentId || !newLinkUrl}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: theme.accent }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {studentsWithoutLink.length === 0 && allStudents.length === 0 && (
          <p className="text-sm text-gray-400">
            No students yet. Links will appear here once students enroll and book classes.
          </p>
        )}
      </div>
      

      {/* ── Upcoming bookings ── */}
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Upcoming bookings
      </h2>
      {bookedSlots.length === 0 ? (
        <p className="mb-8 text-gray-400">No bookings yet.</p>
      ) : (
        <ul className="mb-8 space-y-2">
          {bookedSlots.map((s) => (
            <li
              key={s._id}
              className="flex items-center justify-between rounded-xl p-4"
              style={cardStyle}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: theme.textDark }}>
                  {s.bookedBy?.name ?? "Unknown student"}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(s.startTime).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {s.isDefaultBooking && (
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "#DEF7EC", color: theme.accent }}
                    >
                      Default
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => cancelBooking(s._id)}
                className="text-sm font-medium"
                style={{ color: theme.danger }}
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
