import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";
import { Module } from "@/models/Module";
import { Course } from "@/models/Course";

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
  const submodule = await Submodule.findById(submoduleId);

  if (!submodule) {
    return NextResponse.json({ error: "Submodule not found." }, { status: 404 });
  }

  return NextResponse.json(submodule);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ submoduleId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { submoduleId } = await params;
  await connectDB();

  const submodule = await Submodule.findById(submoduleId);
  if (!submodule) {
    return NextResponse.json({ error: "Submodule not found." }, { status: 404 });
  }

  const courseModule = await Module.findById(submodule.moduleId);
  const course = courseModule ? await Course.findById(courseModule.courseId) : null;
  if (!course || course.teacherId.toString() !== (session.user as any).id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { title } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  submodule.title = title.trim();
  await submodule.save();
  return NextResponse.json(submodule);
}