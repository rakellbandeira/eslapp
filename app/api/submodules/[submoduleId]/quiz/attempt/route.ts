import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";
import { Quiz } from "@/models/Quiz";
import { QuizAttempt } from "@/models/QuizAttempt";
import type { IQuizQuestion } from "@/models/Quiz";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ submoduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { submoduleId } = await params;
  const userId = (session.user as any).id;

  await connectDB();

  const quiz = await Quiz.findOne({ submoduleId });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  const attempt = await QuizAttempt.findOne({ studentId: userId, quizId: quiz._id });

  return NextResponse.json({ attempt: attempt || null });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ submoduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { submoduleId } = await params;
  const userId = (session.user as any).id;

  await connectDB();

  const submodule = await Submodule.findById(submoduleId);
  if (!submodule || submodule.type !== "quiz") {
    return NextResponse.json({ error: "This submodule is not a quiz." }, { status: 400 });
  }

  const quiz = await Quiz.findOne({ submoduleId });
  if (!quiz || quiz.questions.length === 0) {
    return NextResponse.json({ error: "Quiz has no questions yet." }, { status: 400 });
  }

  try {
    const { answers } = await req.json();

    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return NextResponse.json(
        { error: "answers must match the number of questions." },
        { status: 400 }
      );
    }

    // Server-side scoring — the only source of truth
    let score = 0;
    let maxScore = 0;

    quiz.questions.forEach((q: IQuizQuestion, index: number) => {
        maxScore += q.points;
        if (answers[index] === q.correctIndex) {
            score += q.points;
        }
        });

    const attempt = await QuizAttempt.findOneAndUpdate(
      { studentId: userId, quizId: quiz._id },
      { answers, score, maxScore, completedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(attempt);
  } catch (err) {
    console.error("Quiz attempt error:", err);
    return NextResponse.json({ error: "Could not submit quiz." }, { status: 500 });
  }
}