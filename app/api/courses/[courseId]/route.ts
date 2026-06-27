import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";

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
  const course = await Course.findById(courseId);

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PATCH(
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

  // Only the teacher who owns this course can edit it
  if (course.teacherId.toString() !== (session.user as any).id) {
    return NextResponse.json({ error: "Not authorized to edit this course." }, { status: 403 });
  }

  const updates = await req.json();
  const allowedFields = ["title", "description", "isPublished"];

  for (const field of allowedFields) {
    if (field in updates) {
      (course as any)[field] = updates[field];
    }
  }

  await course.save();

  return NextResponse.json(course);
}