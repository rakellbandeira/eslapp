import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { PdfExercise } from "@/models/PdfExercise";
import { PdfSubmission } from "@/models/PdfSubmission";

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

  const exercise = await PdfExercise.findOne({ submoduleId });
  if (!exercise) {
    return NextResponse.json({ error: "PDF exercise not found." }, { status: 404 });
  }

  const submission = await PdfSubmission.findOne({
    studentId: userId,
    pdfExerciseId: exercise._id,
  });

  return NextResponse.json({
    exercise,
    submission: submission || { annotations: [] },
  });
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
  const userId = (session.user as any).id;

  await connectDB();

  const exercise = await PdfExercise.findOne({ submoduleId });
  if (!exercise) {
    return NextResponse.json({ error: "PDF exercise not found." }, { status: 404 });
  }

  try {
    const { annotations } = await req.json();

    if (!Array.isArray(annotations)) {
      return NextResponse.json({ error: "annotations must be an array." }, { status: 400 });
    }

    const submission = await PdfSubmission.findOneAndUpdate(
      { studentId: userId, pdfExerciseId: exercise._id },
      { annotations, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(submission);
  } catch (err) {
    console.error("PDF submission save error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}