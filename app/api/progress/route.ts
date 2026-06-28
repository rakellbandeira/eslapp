import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";
import { Module } from "@/models/Module";
import { Progress } from "@/models/Progress";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const studentId = searchParams.get("studentId") || (session.user as any).id;

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required." }, { status: 400 });
  }

  await connectDB();
  const progress = await Progress.findOne({ studentId, courseId });

  return NextResponse.json(progress || null);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const studentId = (session.user as any).id;

  await connectDB();

  try {
    const { courseId, submoduleId, markComplete } = await req.json();

    if (!courseId || !submoduleId) {
      return NextResponse.json({ error: "courseId and submoduleId are required." }, { status: 400 });
    }

    const submodule = await Submodule.findById(submoduleId);
    if (!submodule) {
      return NextResponse.json({ error: "Submodule not found." }, { status: 404 });
    }

    const update: any = {
      currentModuleId: submodule.moduleId,
      currentSubmoduleId: submoduleId,
      lastAccessedAt: new Date(),
    };

    if (markComplete) {
      update.$addToSet = { completedSubmoduleIds: submoduleId };
    }

    const progress = await Progress.findOneAndUpdate(
      { studentId, courseId },
      update,
      { upsert: true, new: true }
    );

    return NextResponse.json(progress);
  } catch (err) {
    console.error("Progress update error:", err);
    return NextResponse.json({ error: "Could not update progress." }, { status: 500 });
  }
}