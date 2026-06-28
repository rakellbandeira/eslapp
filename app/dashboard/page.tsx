"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Enrollment {
  _id: string;
  courseId: { _id: string; title: string; description: string };
  status: "active" | "revoked";
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/enrollments")
      .then((res) => res.json())
      .then((data) => {
        setEnrollments(data);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">
        Welcome, {session?.user?.name}
      </h1>
      <p className="mb-6 text-gray-600">Your courses</p>

      {enrollments.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-gray-500">
          You're not enrolled in any courses yet. Ask your teacher to add you.
        </p>
      ) : (
        <ul className="space-y-3">
          {enrollments.map((e) => (
            <li key={e._id}>
              <Link
                href={`/courses/${e.courseId._id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
              >
                <h2 className="font-medium text-gray-900">{e.courseId.title}</h2>
                {e.courseId.description && (
                  <p className="mt-1 text-sm text-gray-600">{e.courseId.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}