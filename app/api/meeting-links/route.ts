import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { StudentMeetingLink } from "@/models/StudentMeetingLink";

// Student fetches their own meeting link
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  await connectDB();

  if (role === "student") {
    const link = await StudentMeetingLink.findOne({ studentId: userId });
    return NextResponse.json(link || null);
  }

  // Teacher fetches all their students' links
  const links = await StudentMeetingLink.find({ teacherId: userId })
    .populate("studentId", "name email");
  return NextResponse.json(links);
}

// Teacher sets/updates a student's meeting link
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Only teachers can set meeting links." }, { status: 403 });
  }

  const teacherId = (session.user as any).id;
  await connectDB();

  try {
    const { studentId, url } = await req.json();

    if (!studentId || !url || !url.trim()) {
      return NextResponse.json({ error: "studentId and url are required." }, { status: 400 });
    }

    const link = await StudentMeetingLink.findOneAndUpdate(
      { studentId, teacherId },
      { url: url.trim(), updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(link);
  } catch (err) {
    console.error("Meeting link error:", err);
    return NextResponse.json({ error: "Could not save meeting link." }, { status: 500 });
  }
}