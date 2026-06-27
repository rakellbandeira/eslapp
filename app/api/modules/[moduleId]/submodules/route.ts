import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Module } from "@/models/Module";
import { Course } from "@/models/Course";
import { Submodule } from "@/models/Submodule";

async function verifyTeacherOwnsModule(moduleId: string, userId: string) {
  const courseModule = await Module.findById(moduleId);
  if (!courseModule) return { error: "Module not found.", status: 404 };

  const course = await Course.findById(courseModule.courseId);
  if (!course) return { error: "Course not found.", status: 404 };

  if (course.teacherId.toString() !== userId) {
    return { error: "Not authorized to edit this module.", status: 403 };
  }

  return { courseModule, course };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { moduleId } = await params;

  await connectDB();
  const submodules = await Submodule.find({ moduleId }).sort({ order: 1 });

  return NextResponse.json(submodules);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { moduleId } = await params;

  await connectDB();

  const ownership = await verifyTeacherOwnsModule(moduleId, (session.user as any).id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  try {
    const { title, type } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (!["page", "quiz", "pdf_exercise"].includes(type)) {
      return NextResponse.json({ error: "Invalid submodule type." }, { status: 400 });
    }

    const existingCount = await Submodule.countDocuments({ moduleId });

    const submodule = await Submodule.create({
      moduleId,
      title: title.trim(),
      type,
      order: existingCount,
    });

    return NextResponse.json(submodule, { status: 201 });
  } catch (err) {
    console.error("Submodule creation error:", err);
    return NextResponse.json({ error: "Could not create submodule." }, { status: 500 });
  }
}