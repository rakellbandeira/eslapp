"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Course {
  _id: string;
  title: string;
  description: string;
  isPublished: boolean;
}

interface CourseModule {
  _id: string;
  title: string;
  order: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const [courseRes, modulesRes] = await Promise.all([
      fetch(`/api/courses/${courseId}`),
      fetch(`/api/courses/${courseId}/modules`),
    ]);

    if (courseRes.ok) setCourse(await courseRes.json());
    if (modulesRes.ok) setModules(await modulesRes.json());
    setIsLoading(false);
  }

  useEffect(() => {
    if (courseId) loadData();
  }, [courseId]);

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const res = await fetch(`/api/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newModuleTitle }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not create module.");
      setIsSubmitting(false);
      return;
    }

    setNewModuleTitle("");
    setIsSubmitting(false);
    loadData();
  }

  async function togglePublish() {
    if (!course) return;
    setIsTogglingPublish(true);

    const res = await fetch(`/api/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !course.isPublished }),
    });

    if (res.ok) {
      const updated = await res.json();
      setCourse(updated);
    }
    setIsTogglingPublish(false);
  }

  if (isLoading) {
    return <p className="p-8 text-gray-500">Loading...</p>;
  }

  if (!course) {
    return <p className="p-8 text-red-600">Course not found.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/teacher/courses" className="text-sm text-blue-600 hover:underline">
        ← Back to courses
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{course.title}</h1>
          {course.description && (
            <p className="mt-1 text-gray-600">{course.description}</p>
          )}
        </div>
        <button
          onClick={togglePublish}
          disabled={isTogglingPublish}
          className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            course.isPublished
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {course.isPublished ? "Unpublish" : "Publish"}
        </button>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-medium text-gray-900">Modules</h2>

      <form onSubmit={handleAddModule} className="mb-4 flex gap-2">
        <input
          type="text"
          required
          placeholder="New module title"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add module"}
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {modules.length === 0 ? (
        <p className="text-gray-500">No modules yet. Add your first one above.</p>
      ) : (
        <ul className="space-y-2">
          {modules.map((mod, index) => (
            <li key={mod._id}>
              <Link
                href={`/teacher/courses/${courseId}/modules/${mod._id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
              >
                <span className="text-sm text-gray-500">Module {index + 1}</span>
                <h3 className="font-medium text-gray-900">{mod.title}</h3>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}