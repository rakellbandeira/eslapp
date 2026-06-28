import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { Module } from "@/models/Module";
import { Submodule } from "@/models/Submodule";
import { Progress } from "@/models/Progress";
import { Quiz } from "@/models/Quiz";
import { QuizAttempt } from "@/models/QuizAttempt";
import { PdfExercise } from "@/models/PdfExercise";
import { PdfSubmission } from "@/models/PdfSubmission";
import { Enrollment } from "@/models/Enrollment";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string; courseId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { studentId, courseId } = await params;
  const teacherId = (session.user as any).id;

  await connectDB();

  const course = await Course.findById(courseId);
  if (!course || course.teacherId.toString() !== teacherId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const enrollment = await Enrollment.findOne({ studentId, courseId });
  const progress = await Progress.findOne({ studentId, courseId });

  const modules = await Module.find({ courseId }).sort({ order: 1 });
  const moduleIds = modules.map((m) => m._id);
  const submodules = await Submodule.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });

  // For every quiz-type submodule, get this student's attempt (if any)
  const quizSubmodules = submodules.filter((s) => s.type === "quiz");
  const quizzes = await Quiz.find({ submoduleId: { $in: quizSubmodules.map((s) => s._id) } });
  const quizAttempts = await QuizAttempt.find({
    studentId,
    quizId: { $in: quizzes.map((q) => q._id) },
  });

  // For every pdf_exercise-type submodule, get this student's submission (if any)
  const pdfSubmodules = submodules.filter((s) => s.type === "pdf_exercise");
  const pdfExercises = await PdfExercise.find({ submoduleId: { $in: pdfSubmodules.map((s) => s._id) } });
  const pdfSubmissions = await PdfSubmission.find({
    studentId,
    pdfExerciseId: { $in: pdfExercises.map((p) => p._id) },
  });

  // Assemble a flat, UI-friendly list: one entry per submodule, with whatever
  // status data is relevant to its type already attached.
  const submoduleDetails = submodules.map((sub) => {
    const base = {
      _id: sub._id,
      title: sub.title,
      type: sub.type,
      moduleId: sub.moduleId,
      isCompleted: progress?.completedSubmoduleIds?.some((id: { toString: () => any; }) => id.toString() === sub._id.toString()) || false,
    };

    if (sub.type === "quiz") {
      const quiz = quizzes.find((q) => q.submoduleId.toString() === sub._id.toString());
      const attempt = quiz
        ? quizAttempts.find((a) => a.quizId.toString() === quiz._id.toString())
        : null;
      return {
        ...base,
        score: attempt?.score ?? null,
        maxScore: attempt?.maxScore ?? null,
      };
    }

    if (sub.type === "pdf_exercise") {
      const exercise = pdfExercises.find((p) => p.submoduleId.toString() === sub._id.toString());
      const submission = exercise
        ? pdfSubmissions.find((s) => s.pdfExerciseId.toString() === exercise._id.toString())
        : null;
      return {
        ...base,
        hasSubmission: !!submission && submission.annotations.length > 0,
        score: submission?.score ?? null,
      };
    }

    return base;
  });

  return NextResponse.json({
    enrollment,
    progress,
    modules,
    submodules: submoduleDetails,
  });
}