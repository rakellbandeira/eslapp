import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await connectDB();

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Teachers see their own courses; students see only published ones (filtered further by enrollment later)
  const filter = role === "teacher" ? { teacherId: userId } : { isPublished: true };

  const courses = await Course.find(filter).sort({ createdAt: -1 });

  return NextResponse.json(courses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "teacher") {
    return NextResponse.json({ error: "Only teachers can create courses." }, { status: 403 });
  }

  try {
    const { title, description } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    await connectDB();

    const course = await Course.create({
      title: title.trim(),
      description: description?.trim() || "",
      teacherId: (session.user as any).id,
      isPublished: false,
    });

    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    console.error("Course creation error:", err);
    return NextResponse.json({ error: "Could not create course." }, { status: 500 });
  }
}