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

export default function StudentCoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Confirm this student actually has an active enrollment in this course
      const enrollmentsRes = await fetch("/api/enrollments");
      const enrollments = await enrollmentsRes.json();
      const isEnrolled = enrollments.some(
        (e: any) => e.courseId._id === courseId && e.status === "active"
      );
      setIsAuthorized(isEnrolled);

      if (!isEnrolled) {
        setIsLoading(false);
        return;
      }

      const [courseRes, modulesRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/courses/${courseId}/modules`),
      ]);
      setCourse(await courseRes.json());
      setModules(await modulesRes.json());
      setIsLoading(false);
    }
    load();
  }, [courseId]);

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
      {course.description && <p className="mt-1 text-gray-600">{course.description}</p>}

      <h2 className="mt-8 mb-3 text-lg font-medium text-gray-900">Modules</h2>

      {modules.length === 0 ? (
        <p className="text-gray-500">No modules available yet.</p>
      ) : (
        <ul className="space-y-2">
          {modules.map((mod, index) => (
            <li key={mod._id}>
              <Link
                href={`/courses/${courseId}/modules/${mod._id}`}
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