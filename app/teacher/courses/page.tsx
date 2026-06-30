"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { theme } from "@/lib/theme";

interface Course {
  _id: string;
  title: string;
  description: string;
  isPublished: boolean;
  createdAt: string;
}

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadCourses() {
    setIsLoading(true);
    const res = await fetch("/api/courses");
    if (res.ok) setCourses(await res.json());
    setIsLoading(false);
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not create course.");
      setIsSubmitting(false);
      return;
    }

    setTitle("");
    setDescription("");
    setShowForm(false);
    setIsSubmitting(false);
    loadCourses();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={{ color: theme.textDark }}>
          My Courses
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: theme.primaryDark }}
        >
          {showForm ? "Cancel" : "+ New Course"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-4 rounded-xl p-6"
          style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Course title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
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
            {isSubmitting ? "Creating..." : "Create course"}
          </button>
        </form>
      )}

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Your courses
      </h2>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : courses.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
        >
          <p className="text-gray-500">No courses yet. Create your first one above.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {courses.map((course) => (
            <li key={course._id}>
              <Link
                href={`/teacher/courses/${course._id}`}
                className="block rounded-xl p-5 transition-shadow hover:shadow-md"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: theme.cardShadow,
                  borderLeft: `4px solid ${theme.primary}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold" style={{ color: theme.primaryDark }}>
                    {course.title}
                  </h3>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={
                      course.isPublished
                        ? { backgroundColor: "#DEF7EC", color: theme.accent }
                        : { backgroundColor: "#F1F1F1", color: "#888" }
                    }
                  >
                    {course.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                {course.description && (
                  <p className="mt-1 text-sm text-gray-500">{course.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}