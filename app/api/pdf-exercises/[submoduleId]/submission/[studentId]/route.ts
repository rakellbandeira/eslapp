import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";
import { Module } from "@/models/Module";
import { Course } from "@/models/Course";
import { PdfExercise } from "@/models/PdfExercise";
import { PdfSubmission } from "@/models/PdfSubmission";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ submoduleId: string; studentId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { submoduleId, studentId } = await params;
  const teacherId = (session.user as any).id;

  await connectDB();

  // Verify this teacher actually owns the course this submodule belongs to
  const submodule = await Submodule.findById(submoduleId);
  if (!submodule) {
    return NextResponse.json({ error: "Submodule not found." }, { status: 404 });
  }
  const courseModule = await Module.findById(submodule.moduleId);
  const course = courseModule ? await Course.findById(courseModule.courseId) : null;
  if (!course || course.teacherId.toString() !== teacherId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const exercise = await PdfExercise.findOne({ submoduleId });
  if (!exercise) {
    return NextResponse.json({ error: "PDF exercise not found." }, { status: 404 });
  }

  const submission = await PdfSubmission.findOne({ studentId, pdfExerciseId: exercise._id });

  return NextResponse.json({
    exercise,
    submission: submission || { annotations: [] },
  });
}