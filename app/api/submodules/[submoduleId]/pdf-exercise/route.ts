import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";
import { Module } from "@/models/Module";
import { Course } from "@/models/Course";
import { PdfExercise } from "@/models/PdfExercise";

async function verifyTeacherOwnsSubmodule(submoduleId: string, userId: string) {
  const submodule = await Submodule.findById(submoduleId);
  if (!submodule) return { error: "Submodule not found.", status: 404 as const };

  const courseModule = await Module.findById(submodule.moduleId);
  if (!courseModule) return { error: "Module not found.", status: 404 as const };

  const course = await Course.findById(courseModule.courseId);
  if (!course) return { error: "Course not found.", status: 404 as const };

  if (course.teacherId.toString() !== userId) {
    return { error: "Not authorized.", status: 403 as const };
  }

  return { submodule };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ submoduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { submoduleId } = await params;

  await connectDB();
  const exercise = await PdfExercise.findOne({ submoduleId });

  return NextResponse.json(exercise || null);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ submoduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { submoduleId } = await params;

  await connectDB();

  const ownership = await verifyTeacherOwnsSubmodule(submoduleId, (session.user as any).id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  try {
    const { fileUrl, fileName, totalPoints, assignmentMessage } = await req.json();

    if (!fileUrl || !fileName) {
      return NextResponse.json({ error: "fileUrl and fileName are required." }, { status: 400 });
    }

    const exercise = await PdfExercise.findOneAndUpdate(
      { submoduleId },
      { fileUrl, fileName, totalPoints, assignmentMessage: assignmentMessage ?? "", updatedAt: new Date() },      
      { upsert: true, new: true }
    );

    return NextResponse.json(exercise);
  } catch (err) {
    console.error("PDF exercise save error:", err);
    return NextResponse.json({ error: "Could not save PDF exercise." }, { status: 500 });
  }
}