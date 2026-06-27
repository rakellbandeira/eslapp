"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface CourseModule {
  _id: string;
  title: string;
}

interface Submodule {
  _id: string;
  title: string;
  type: "page" | "quiz" | "pdf_exercise";
  order: number;
}

const TYPE_LABELS: Record<string, string> = {
  page: "Page",
  quiz: "Quiz",
  pdf_exercise: "PDF Exercise",
};

const TYPE_COLORS: Record<string, string> = {
  page: "bg-blue-100 text-blue-700",
  quiz: "bg-purple-100 text-purple-700",
  pdf_exercise: "bg-amber-100 text-amber-700",
};

export default function ModuleDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;

  const [courseModule, setCourseModule] = useState<CourseModule | null>(null);
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"page" | "quiz" | "pdf_exercise">("page");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const [moduleRes, submodulesRes] = await Promise.all([
      fetch(`/api/modules/${moduleId}`),
      fetch(`/api/modules/${moduleId}/submodules`),
    ]);

    if (moduleRes.ok) setCourseModule(await moduleRes.json());
    if (submodulesRes.ok) setSubmodules(await submodulesRes.json());
    setIsLoading(false);
  }

  useEffect(() => {
    if (moduleId) loadData();
  }, [moduleId]);

  async function handleAddSubmodule(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const res = await fetch(`/api/modules/${moduleId}/submodules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, type: newType }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not create submodule.");
      setIsSubmitting(false);
      return;
    }

    setNewTitle("");
    setIsSubmitting(false);
    loadData();
  }

  if (isLoading) {
    return <p className="p-8 text-gray-500">Loading...</p>;
  }

  if (!courseModule) {
    return <p className="p-8 text-red-600">Module not found.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href={`/teacher/courses/${courseId}`} className="text-sm text-blue-600 hover:underline">
        ← Back to course
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{courseModule.title}</h1>

      <h2 className="mt-8 mb-3 text-lg font-medium text-gray-900">Submodules</h2>

      <form onSubmit={handleAddSubmodule} className="mb-4 flex gap-2">
        <input
          type="text"
          required
          placeholder="New submodule title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as any)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="page">Page</option>
          <option value="quiz">Quiz</option>
          <option value="pdf_exercise">PDF Exercise</option>
        </select>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add"}
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {submodules.length === 0 ? (
        <p className="text-gray-500">No submodules yet. Add your first one above.</p>
      ) : (
        <ul className="space-y-2">
          {submodules.map((sub, index) => (
            <li key={sub._id}>
              <Link
                href={`/teacher/courses/${courseId}/modules/${moduleId}/submodules/${sub._id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
              >
                <div>
                  <span className="text-sm text-gray-500">#{index + 1}</span>
                  <h3 className="font-medium text-gray-900">{sub.title}</h3>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[sub.type]}`}>
                  {TYPE_LABELS[sub.type]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}