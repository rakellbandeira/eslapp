"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { theme } from "@/lib/theme";

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

    if (res.ok) setCourse(await res.json());
    setIsTogglingPublish(false);
  }

  if (isLoading) return <p className="px-4 py-12 text-gray-400">Loading...</p>;
  if (!course) return <p className="px-4 py-12 text-red-600">Course not found.</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/teacher/courses" className="text-sm font-medium" style={{ color: theme.primaryDark }}>
        ← Back to courses
      </Link>

      <div className="mt-4 mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: theme.textDark }}>
            {course.title}
          </h1>
          {course.description && <p className="mt-1 text-gray-500">{course.description}</p>}
        </div>
        <button
          onClick={togglePublish}
          disabled={isTogglingPublish}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: course.isPublished ? "#A0AEC0" : theme.accent }}
        >
          {course.isPublished ? "Unpublish" : "Publish"}
        </button>
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Modules</h2>

      <form onSubmit={handleAddModule} className="mb-6 flex gap-2">
        <input
          type="text"
          required
          placeholder="New module title"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: theme.primaryDark }}
        >
          {isSubmitting ? "Adding..." : "Add module"}
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {modules.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
        >
          <p className="text-gray-500">No modules yet. Add your first one above.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {modules.map((mod, index) => (
            <li key={mod._id}>
              <Link
                href={`/teacher/courses/${courseId}/modules/${mod._id}`}
                className="block rounded-xl p-5 transition-shadow hover:shadow-md"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: theme.cardShadow,
                  borderLeft: `4px solid ${theme.primary}`,
                }}
              >
                <span className="text-xs font-medium uppercase text-gray-400">
                  Module {index + 1}
                </span>
                <h3 className="font-semibold" style={{ color: theme.primaryDark }}>
                  {mod.title}
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}