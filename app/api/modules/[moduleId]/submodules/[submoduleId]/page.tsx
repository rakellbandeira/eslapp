import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";
import { Module } from "@/models/Module";
import { Course } from "@/models/Course";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ moduleId: string; submoduleId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { moduleId, submoduleId } = await params;
  const teacherId = (session.user as any).id;

  await connectDB();

  const courseModule = await Module.findById(moduleId);
  if (!courseModule) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  const course = await Course.findById(courseModule.courseId);
  if (!course || course.teacherId.toString() !== teacherId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const submodule = await Submodule.findById(submoduleId);
  if (!submodule) {
    return NextResponse.json({ error: "Submodule not found." }, { status: 404 });
  }

  await Submodule.deleteOne({ _id: submoduleId });

  return NextResponse.json({ success: true });
}