import { auth } from "@/auth";
import { redirect } from "next/navigation";

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

  return <>{children}</>;
}