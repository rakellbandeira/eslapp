import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user as any).role !== "teacher") {
    redirect("/dashboard");
  }

  return (
    <div>
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex gap-4">
          <Link href="/teacher/courses" className="text-sm font-medium text-gray-700 hover:text-blue-600">
            Courses
          </Link>
          <Link href="/teacher/students" className="text-sm font-medium text-gray-700 hover:text-blue-600">
            Students
          </Link>
          <Link href="/teacher/availability" className="text-sm font-medium text-gray-700 hover:text-blue-600">
            Availability
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}