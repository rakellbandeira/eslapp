import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TeacherNav from "@/components/TeacherNav";

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
    <div className="min-h-screen" style={{ backgroundColor: "#F2EEF0" }}>
      <TeacherNav />
      <main>{children}</main>
    </div>
  );
}