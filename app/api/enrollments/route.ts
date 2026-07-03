import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  await connectDB();

  if (role === "student") {
    const enrollments = await Enrollment.find({ studentId: userId, status: "active" })
      .populate("courseId");
    // Filter out enrollments where the course was deleted (courseId populates as null)
    const valid = enrollments.filter((e) => e.courseId !== null);
    return NextResponse.json(valid);
  }

  // A teacher sees all enrollments for courses they own
  const myCourses = await Course.find({ teacherId: userId }).select("_id");
  const courseIds = myCourses.map((c) => c._id);

  const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
    .populate("studentId", "name email")
    .populate("courseId", "title");

  return NextResponse.json(enrollments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Only teachers can assign courses." }, { status: 403 });
  }

  const teacherId = (session.user as any).id;

  await connectDB();

  try {
    const { studentEmail, courseId } = await req.json();

    if (!studentEmail || !courseId) {
      return NextResponse.json({ error: "studentEmail and courseId are required." }, { status: 400 });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    if (course.teacherId.toString() !== teacherId) {
      return NextResponse.json({ error: "You do not own this course." }, { status: 403 });
    }

    const student = await User.findOne({ email: studentEmail.toLowerCase(), role: "student" });
    if (!student) {
      return NextResponse.json({ error: "No student found with that email." }, { status: 404 });
    }

    // If an enrollment already exists (even a revoked one), reactivate it instead of erroring
    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId: student._id, courseId },
      { status: "active", assignedBy: teacherId, assignedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(enrollment, { status: 201 });
  } catch (err) {
    console.error("Enrollment error:", err);
    return NextResponse.json({ error: "Could not create enrollment." }, { status: 500 });
  }
}