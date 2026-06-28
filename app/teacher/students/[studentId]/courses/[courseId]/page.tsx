"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ModuleInfo {
  _id: string;
  title: string;
  order: number;
}

interface SubmoduleDetail {
  _id: string;
  title: string;
  type: "page" | "quiz" | "pdf_exercise";
  moduleId: string;
  isCompleted: boolean;
  score?: number | null;
  maxScore?: number | null;
  hasSubmission?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  page: "Page",
  quiz: "Quiz",
  pdf_exercise: "PDF Exercise",
};

export default function StudentCourseProgressPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const courseId = params.courseId as string;

  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [submodules, setSubmodules] = useState<SubmoduleDetail[]>([]);
  const [currentSubmoduleId, setCurrentSubmoduleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teacher/students/${studentId}/courses/${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        setModules(data.modules || []);
        setSubmodules(data.submodules || []);
        setCurrentSubmoduleId(data.progress?.currentSubmoduleId?.toString() || null);
        setIsLoading(false);
      });
  }, [studentId, courseId]);

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  const completedCount = submodules.filter((s) => s.isCompleted).length;
  const totalCount = submodules.length;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/teacher/students" className="text-sm text-blue-600 hover:underline">
        ← Back to students
      </Link>

      <div className="mt-4 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Student progress</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {completedCount} / {totalCount} completed
        </span>
      </div>

      {modules.map((mod) => {
        const modSubmodules = submodules.filter((s) => s.moduleId === mod._id);
        if (modSubmodules.length === 0) return null;

        return (
          <div key={mod._id} className="mb-4">
            <h2 className="mb-2 font-medium text-gray-900">{mod.title}</h2>
            <ul className="space-y-2">
              {modSubmodules.map((sub) => (
                <li
                  key={sub._id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    currentSubmoduleId === sub._id
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {sub.isCompleted ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-300">○</span>
                    )}
                    <span className="text-sm text-gray-900">{sub.title}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {TYPE_LABELS[sub.type]}
                    </span>
                    {currentSubmoduleId === sub._id && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Currently here
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {sub.type === "quiz" && sub.score !== null && sub.score !== undefined && (
                      <span className="text-sm font-medium text-gray-700">
                        {sub.score} / {sub.maxScore}
                      </span>
                    )}

                    {sub.type === "pdf_exercise" && (
                      <>
                        {sub.hasSubmission ? (
                          <Link
                            href={`/teacher/students/${studentId}/pdf-exercise/${sub._id}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View submission
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">No submission yet</span>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}