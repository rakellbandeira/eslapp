"use client";

import { useState, useEffect } from "react";

interface Course {
  _id: string;
  title: string;
}

interface Enrollment {
  _id: string;
  studentId: { _id: string; name: string; email: string };
  courseId: { _id: string; title: string };
  status: "active" | "revoked";
  assignedAt: string;
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

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Students</h1>

      <form onSubmit={handleAssign} className="mb-8 space-y-3 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-medium text-gray-900">Assign a course</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Student email</label>
          <input
            type="email"
            required
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            placeholder="student@example.com"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            The student must already have an account (they sign up themselves first).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Course</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Assigning..." : "Assign course"}
        </button>
      </form>

      <h2 className="mb-3 text-lg font-medium text-gray-900">Current enrollments</h2>

      {enrollments.length === 0 ? (
        <p className="text-gray-500">No students enrolled yet.</p>
      ) : (
        <ul className="space-y-2">
          {enrollments.map((e) => (
            <li
              key={e._id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="font-medium text-gray-900">{e.studentId?.name}</p>
                <p className="text-sm text-gray-500">{e.studentId?.email}</p>
                <p className="text-sm text-gray-600">{e.courseId?.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    e.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {e.status === "active" ? "Active" : "Revoked"}
                </span>
                <button
                  onClick={() => toggleStatus(e)}
                  className="text-sm text-blue-600 hover:underline"
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