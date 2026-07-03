"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { theme } from "@/lib/theme";

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

const TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  page: { bg: "#EDE7F6", color: theme.primaryDark },
  quiz: { bg: "#F3E5F5", color: "#8E44AD" },
  pdf_exercise: { bg: "#FFF3E0", color: "#D68910" },
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
  const [editingSubmoduleId, setEditingSubmoduleId] = useState<string | null>(null);
  const [editingSubmoduleTitle, setEditingSubmoduleTitle] = useState("");

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

  async function handleReorder(submoduleId: string, direction: -1 | 1) {
    const index = submodules.findIndex((s) => s._id === submoduleId);
    const target = index + direction;
    if (target < 0 || target >= submodules.length) return;

    const reordered = [...submodules];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // Optimistically update UI immediately
    setSubmodules(reordered);

    await fetch(`/api/modules/${moduleId}/submodules/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((s) => s._id) }),
    });
  }

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

  if (isLoading) return <p className="px-4 py-12 text-gray-400">Loading...</p>;
  if (!courseModule) return <p className="px-4 py-12 text-red-600">Module not found.</p>;

  async function handleDeleteSubmodule(submoduleId: string) {
    const confirmed = window.confirm(
      "Delete this submodule? This cannot be undone, and any student progress or content inside it will be lost."
    );
    if (!confirmed) return;

    await fetch(`/api/modules/${moduleId}/submodules/${submoduleId}`, {
      method: "DELETE",
    });
    loadData();
  }

  async function handleSaveSubmoduleTitle(submoduleId: string) {
    if (!editingSubmoduleTitle.trim()) return;
    await fetch(`/api/submodules/${submoduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingSubmoduleTitle }),
    });
    setEditingSubmoduleId(null);
    loadData();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/teacher/courses/${courseId}`}
        className="text-sm font-medium"
        style={{ color: theme.primaryDark }}
      >
        ← Back to course
      </Link>

      <h1 className="mt-4 mb-8 text-3xl font-bold" style={{ color: theme.textDark }}>
        {courseModule.title}
      </h1>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Submodules
      </h2>

      <form onSubmit={handleAddSubmodule} className="mb-6 flex gap-2">
        <input
          type="text"
          required
          placeholder="New submodule title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as any)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
        >
          <option value="page">Page</option>
          <option value="quiz">Quiz</option>
          <option value="pdf_exercise">PDF Exercise</option>
        </select>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: theme.primaryDark }}
        >
          {isSubmitting ? "Adding..." : "Add"}
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {submodules.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
        >
          <p className="text-gray-500">No submodules yet. Add your first one above.</p>
        </div>
      ) : (
        <ul className="space-y-2">

          {submodules.map((sub, index) => (
            <li key={sub._id} className="flex items-center gap-2">
              {editingSubmoduleId === sub._id ? (
                <div
                  className="flex flex-1 items-center gap-2 rounded-xl p-3"
                  style={{ backgroundColor: "#FFFFFF", boxShadow: theme.cardShadow }}
                >
                  <input
                    type="text"
                    value={editingSubmoduleTitle}
                    onChange={(e) => setEditingSubmoduleTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveSubmoduleTitle(sub._id);
                      if (e.key === "Escape") setEditingSubmoduleId(null);
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveSubmoduleTitle(sub._id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                    style={{ backgroundColor: theme.accent }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingSubmoduleId(null)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <Link
                  href={`/teacher/courses/${courseId}/modules/${moduleId}/submodules/${sub._id}`}
                  className="flex flex-1 items-center justify-between rounded-xl p-5 transition-shadow hover:shadow-md"
                  style={{
                    backgroundColor: "#FFFFFF",
                    boxShadow: theme.cardShadow,
                    borderLeft: `4px solid ${theme.primary}`,
                  }}
                >
                  <div>
                    <span className="text-xs font-medium uppercase text-gray-400">#{index + 1}</span>
                    <h3 className="font-semibold" style={{ color: theme.primaryDark }}>
                      {sub.title}
                    </h3>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: TYPE_STYLES[sub.type].bg,
                      color: TYPE_STYLES[sub.type].color,
                    }}
                  >
                    {TYPE_LABELS[sub.type]}
                  </span>
                </Link>
              )}

              {editingSubmoduleId !== sub._id && (
                <>
                  <button
                    onClick={() => handleReorder(sub._id, -1)}
                    disabled={index === 0}
                    className="rounded px-2 py-2 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleReorder(sub._id, 1)}
                    disabled={index === submodules.length - 1}
                    className="rounded px-2 py-2 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => {
                      setEditingSubmoduleId(sub._id);
                      setEditingSubmoduleTitle(sub.title);
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: theme.primaryDark }}
                    title="Edit submodule title"
                  >
                    Edit
                  </button>

                    

                  <button
                    onClick={() => handleDeleteSubmodule(sub._id)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#E57373" }}
                    title="Delete submodule"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}

          
        </ul>
      )}
    </div>
  );
}