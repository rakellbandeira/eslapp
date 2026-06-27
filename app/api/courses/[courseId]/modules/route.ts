import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { Module } from "@/models/Module";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { courseId } = await params;

  await connectDB();
  const modules = await Module.find({ courseId }).sort({ order: 1 });

  return NextResponse.json(modules);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { courseId } = await params;

  await connectDB();
  const course = await Course.findById(courseId);

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (course.teacherId.toString() !== (session.user as any).id) {
    return NextResponse.json({ error: "Not authorized to edit this course." }, { status: 403 });
  }

  try {
    const { title } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const existingCount = await Module.countDocuments({ courseId });

    const newModule = await Module.create({
      courseId,
      title: title.trim(),
      order: existingCount,
    });

    return NextResponse.json(newModule, { status: 201 });
  } catch (err) {
    console.error("Module creation error:", err);
    return NextResponse.json({ error: "Could not create module." }, { status: 500 });
  }
}