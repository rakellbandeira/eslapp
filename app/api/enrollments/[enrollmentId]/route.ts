import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { enrollmentId } = await params;
  const teacherId = (session.user as any).id;

  await connectDB();

  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }

  const course = await Course.findById(enrollment.courseId);
  if (!course || course.teacherId.toString() !== teacherId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const { status } = await req.json();
    if (!["active", "revoked"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    enrollment.status = status;
    await enrollment.save();

    return NextResponse.json(enrollment);
  } catch (err) {
    console.error("Enrollment update error:", err);
    return NextResponse.json({ error: "Could not update enrollment." }, { status: 500 });
  }
}