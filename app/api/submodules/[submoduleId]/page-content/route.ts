import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";
import { Module } from "@/models/Module";
import { Course } from "@/models/Course";
import { Page } from "@/models/Page";

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
  const page = await Page.findOne({ submoduleId });

  // Returning an empty shell rather than 404 makes the editor's first-load simpler
  return NextResponse.json(page || { submoduleId, contentBlocks: [] });
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
    const { contentBlocks } = await req.json();

    if (!Array.isArray(contentBlocks)) {
      return NextResponse.json({ error: "contentBlocks must be an array." }, { status: 400 });
    }

    // Upsert: create the Page doc if it doesn't exist yet, update if it does
    const page = await Page.findOneAndUpdate(
      { submoduleId },
      { contentBlocks, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(page);
  } catch (err) {
    console.error("Page save error:", err);
    return NextResponse.json({ error: "Could not save page." }, { status: 500 });
  }
}