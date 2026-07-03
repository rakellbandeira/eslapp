"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Course {
  _id: string;
  title: string;
  description: string;
}

interface CourseModule {
  _id: string;
  title: string;
  order: number;
}

interface Submodule {
  _id: string;
  moduleId: string;
}

export default function StudentCoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [submodulesByModule, setSubmodulesByModule] = useState<Record<string, string[]>>({});
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Confirm enrollment
      const enrollmentsRes = await fetch("/api/enrollments");
      const enrollments = await enrollmentsRes.json();
      const isEnrolled = enrollments.some(
        (e: any) => e.courseId?._id === courseId && e.status === "active"
      );
      setIsAuthorized(isEnrolled);

      if (!isEnrolled) {
        setIsLoading(false);
        return;
      }

      const [courseRes, modulesRes, progressRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/courses/${courseId}/modules`),
        fetch(`/api/progress?courseId=${courseId}`),
      ]);

      const courseData = await courseRes.json();
      const modulesData: CourseModule[] = await modulesRes.json();
      const progressData = await progressRes.json();

      setCourse(courseData);
      setModules(modulesData);
      setCompletedIds(
        (progressData?.completedSubmoduleIds || []).map((id: any) => id.toString())
      );

      // Fetch submodules for every module in parallel
      const submoduleResults = await Promise.all(
        modulesData.map((mod) =>
          fetch(`/api/modules/${mod._id}/submodules`)
            .then((r) => r.json())
            .then((subs: Submodule[]) => ({ moduleId: mod._id, subs }))
        )
      );

      // Build a map: moduleId → [submoduleId, submoduleId, ...]
      const map: Record<string, string[]> = {};
      for (const { moduleId, subs } of submoduleResults) {
        map[moduleId] = subs.map((s) => s._id);
      }
      setSubmodulesByModule(map);

      setIsLoading(false);
    }
    load();
  }, [courseId]);

  function isModuleComplete(moduleId: string): boolean {
    const ids = submodulesByModule[moduleId];
    if (!ids || ids.length === 0) return false;
    return ids.every((id) => completedIds.includes(id));
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  if (isAuthorized === false) {
    return (
      <div className="p-8">
        <p className="text-red-600">You are not enrolled in this course.</p>
        <Link href="/dashboard" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!course) return <p className="p-8 text-red-600">Course not found.</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{course.title}</h1>
      {course.description && (
        <p className="mt-1 text-gray-600">{course.description}</p>
      )}

      <h2 className="mt-8 mb-3 text-lg font-medium text-gray-900">Modules</h2>

      {modules.length === 0 ? (
        <p className="text-gray-500">No modules available yet.</p>
      ) : (
        <ul className="space-y-2">
          {modules.map((mod, index) => {
            const complete = isModuleComplete(mod._id);
            const subCount = submodulesByModule[mod._id]?.length ?? 0;
            const completedCount = (submodulesByModule[mod._id] ?? []).filter((id) =>
              completedIds.includes(id)
            ).length;

            return (
              <li key={mod._id}>
                <Link
                  href={`/courses/${courseId}/modules/${mod._id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
                >
                  <div className="flex items-center gap-3">
                    {complete ? (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm text-white"
                        style={{ backgroundColor: "#3DB89A" }}
                        title="Module complete"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-gray-500"
                        style={{ backgroundColor: "#F1F1F1" }}
                      >
                        {index + 1}
                      </span>
                    )}
                    <div>
                      <h3
                        className="font-medium"
                        style={{ color: complete ? "#3DB89A" : "#1A202C" }}
                      >
                        {mod.title}
                      </h3>
                      {subCount > 0 && (
                        <p className="text-xs text-gray-400">
                          {completedCount} / {subCount} completed
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-gray-400">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}