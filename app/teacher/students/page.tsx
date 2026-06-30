"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { theme } from "@/lib/theme";

interface Course {
  _id: string;
  title: string;
}

interface Enrollment {
  _id: string;
  studentId: { _id: string; name: string; email: string };
  courseId: { _id: string; title: string };
  status: "active" | "revoked";
}

export default function TeacherStudentsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentEmail, setStudentEmail] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const [coursesRes, enrollmentsRes] = await Promise.all([
      fetch("/api/courses"),
      fetch("/api/enrollments"),
    ]);
    const coursesData = await coursesRes.json();
    const enrollmentsData = await enrollmentsRes.json();
    setCourses(coursesData);
    setEnrollments(enrollmentsData);
    if (coursesData.length > 0) setSelectedCourseId(coursesData[0]._id);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const res = await fetch("/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentEmail, courseId: selectedCourseId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not assign course.");
      setIsSubmitting(false);
      return;
    }

    setStudentEmail("");
    setIsSubmitting(false);
    loadData();
  }

  async function toggleStatus(enrollment: Enrollment) {
    const newStatus = enrollment.status === "active" ? "revoked" : "active";
    await fetch(`/api/enrollments/${enrollment._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadData();
  }

  if (isLoading) return <p className="px-4 py-12 text-gray-400">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold" style={{ color: theme.textDark }}>
        Students
      </h1>

      <form
        onSubmit={handleAssign}
        className="mb-8 space-y-4 rounded-xl p-6"
        style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
      >
        <h2 className="font-semibold" style={{ color: theme.primaryDark }}>
          Assign a course
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Student email</label>
          <input
            type="email"
            required
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            placeholder="student@example.com"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
          />
          <p className="mt-1 text-xs text-gray-400">
            The student must already have an account.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Course</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
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
          {isSubmitting ? "Assigning..." : "Assign course"}
        </button>
      </form>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Current enrollments
      </h2>

      {enrollments.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
        >
          <p className="text-gray-500">No students enrolled yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {enrollments.map((e) => (
            <li
              key={e._id}
              className="flex items-center justify-between rounded-xl p-5"
              style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
            >
              <div>
                <p className="font-semibold" style={{ color: theme.textDark }}>
                  {e.studentId?.name}
                </p>
                <p className="text-sm text-gray-400">{e.studentId?.email}</p>
                <p className="text-sm" style={{ color: theme.primaryDark }}>
                  {e.courseId?.title}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/teacher/students/${e.studentId?._id}/courses/${e.courseId?._id}`}
                  className="text-sm font-medium"
                  style={{ color: theme.accent }}
                >
                  View progress
                </Link>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={
                    e.status === "active"
                      ? { backgroundColor: "#DEF7EC", color: theme.accent }
                      : { backgroundColor: "#F1F1F1", color: "#888" }
                  }
                >
                  {e.status === "active" ? "Active" : "Revoked"}
                </span>
                <button
                  onClick={() => toggleStatus(e)}
                  className="text-sm font-medium"
                  style={{ color: theme.danger }}
                >
                  {e.status === "active" ? "Revoke" : "Reactivate"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}