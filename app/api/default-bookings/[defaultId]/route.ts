import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { DefaultBooking } from "@/models/DefaultBooking";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ defaultId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  await connectDB();

  const defaultBooking = await DefaultBooking.findById((await params).defaultId);
  if (!defaultBooking) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const isOwningStudent = defaultBooking.studentId.toString() === userId;
  const isOwningTeacher = role === "teacher" && defaultBooking.teacherId.toString() === userId;
  if (!isOwningStudent && !isOwningTeacher) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  defaultBooking.isActive = false;
  await defaultBooking.save();

  // Release every FUTURE generated slot that was auto-booked because of this
  // default — past slots stay untouched, since those classes already happened.
  await AvailabilitySlot.updateMany(
    {
      bookedBy: defaultBooking.studentId,
      isDefaultBooking: true,
      startTime: { $gte: new Date() },
    },
    { status: "open", bookedBy: undefined, isDefaultBooking: false }
  );

  return NextResponse.json({ success: true });
}