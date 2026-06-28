import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";
import { Module } from "@/models/Module";
import { Course } from "@/models/Course";
import { Quiz } from "@/models/Quiz";
import type { IQuizQuestion } from "@/models/Quiz";

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
  const role = (session.user as any).role;

  await connectDB();
  const quiz = await Quiz.findOne({ submoduleId });

  if (!quiz) {
    return NextResponse.json({ submoduleId, questions: [] });
  }

  // Students never receive correctIndex — only teachers, who need it to edit
  if (role !== "teacher") {
    const sanitized = {
      _id: quiz._id,
      submoduleId: quiz.submoduleId,
      questions: quiz.questions.map((q: IQuizQuestion) => ({
        question: q.question,
        options: q.options,
        points: q.points,
      })),
    };
    return NextResponse.json(sanitized);
  }

  return NextResponse.json(quiz);
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
    const { questions } = await req.json();

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "questions must be an array." }, { status: 400 });
    }

    // Basic validation: every question needs at least 2 options and a valid correctIndex
    for (const q of questions) {
      if (!q.question || !q.question.trim()) {
        return NextResponse.json({ error: "Every question needs text." }, { status: 400 });
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return NextResponse.json({ error: "Every question needs at least 2 options." }, { status: 400 });
      }
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        return NextResponse.json({ error: "correctIndex must point to a valid option." }, { status: 400 });
      }
    }

    const quiz = await Quiz.findOneAndUpdate(
      { submoduleId },
      { questions, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(quiz);
  } catch (err) {
    console.error("Quiz save error:", err);
    return NextResponse.json({ error: "Could not save quiz." }, { status: 500 });
  }
}