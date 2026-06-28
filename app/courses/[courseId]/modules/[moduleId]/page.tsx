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

const TYPE_ROUTES: Record<string, string> = {
  page: "/courses/lesson",
  quiz: "/student/quiz",
  pdf_exercise: "/student/pdf-exercise",
};

export default function StudentModulePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;

  const [courseModule, setCourseModule] = useState<CourseModule | null>(null);
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/modules/${moduleId}`).then((r) => r.json()),
      fetch(`/api/modules/${moduleId}/submodules`).then((r) => r.json()),
    ]).then(([moduleData, submodulesData]) => {
      setCourseModule(moduleData);
      setSubmodules(submodulesData);
      setIsLoading(false);
    });
  }, [moduleId]);

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;
  if (!courseModule) return <p className="p-8 text-red-600">Module not found.</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href={`/courses/${courseId}`} className="text-sm text-blue-600 hover:underline">
        ← Back to course
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-semibold text-gray-900">{courseModule.title}</h1>

      {submodules.length === 0 ? (
        <p className="text-gray-500">No content available yet.</p>
      ) : (
        <ul className="space-y-2">
          {submodules.map((sub, index) => (
            <li key={sub._id}>
              <Link
                href={`${TYPE_ROUTES[sub.type]}/${sub._id}`}
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