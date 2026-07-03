import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Module } from "@/models/Module";
import { Course } from "@/models/Course";
import { Submodule } from "@/models/Submodule";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { moduleId } = await params;
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

  try {
    // orderedIds is the full list of submodule IDs in the new desired order
    const { orderedIds } = await req.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "orderedIds must be an array." }, { status: 400 });
    }

    // Update each submodule's order field to its position in the new array
    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        Submodule.updateOne({ _id: id }, { order: index })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reorder error:", err);
    return NextResponse.json({ error: "Could not reorder submodules." }, { status: 500 });
  }
}