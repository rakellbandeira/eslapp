import { auth } from "@/auth";
import { redirect } from "next/navigation";
import StudentNav from "@/components/StudentNav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EEF0" }}>
      <StudentNav userName={session.user.name || ""} />
      <main>{children}</main>
      <footer
        className="mt-16 py-6 text-center text-sm text-gray-300"
        style={{ backgroundColor: "#2D3748" }}
      >
        © 2026 ESL Pals. All rights reserved.
      </footer>
    </div>
  );
}