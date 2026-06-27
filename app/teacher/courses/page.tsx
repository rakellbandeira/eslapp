"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
    if (res.ok) {
      const data = await res.json();
      setCourses(data);
    }
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
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Courses</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ New Course"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-white p-6"
        >
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Course title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create course"}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading courses...</p>
      ) : courses.length === 0 ? (
        <p className="text-gray-500">No courses yet. Create your first one above.</p>
      ) : (
        <ul className="space-y-3">
          {courses.map((course) => (
            <li
              key={course._id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
            >
              <Link href={`/teacher/courses/${course._id}`} className="block">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-gray-900">{course.title}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      course.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {course.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                {course.description && (
                  <p className="mt-1 text-sm text-gray-600">{course.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}