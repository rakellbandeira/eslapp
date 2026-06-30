"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Enrollment {
  _id: string;
  courseId: { _id: string; title: string; description: string };
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold" style={{ color: "#1A202C" }}>
        Welcome, {session?.user?.name}
      </h1>

      <h2 className="mb-4 text-lg font-semibold text-gray-500 uppercase tracking-wide text-sm">
        Your Courses
      </h2>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : enrollments.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "#FFFFFF", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
        >
          <p className="text-gray-500">
            You're not enrolled in any courses yet. Ask your teacher to add you.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((e) => (
            <li key={e._id}>
              <Link
                href={`/courses/${e.courseId._id}`}
                className="block rounded-xl p-6 transition-shadow hover:shadow-md"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  borderLeft: "4px solid #9370BE",
                }}
              >
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "#7B5EA7" }}
                >
                  {e.courseId.title}
                </h3>
                {e.courseId.description && (
                  <p className="mt-1 text-sm text-gray-500">{e.courseId.description}</p>
                )}
                <span
                  className="mt-3 inline-block text-sm font-medium"
                  style={{ color: "#3DB89A" }}
                >
                  Continue →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}