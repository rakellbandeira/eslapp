import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  await connectDB();

  const slot = await AvailabilitySlot.findById((await params).slotId);
  if (!slot) {
    return NextResponse.json({ error: "Slot not found." }, { status: 404 });
  }

  // A student can cancel their own booking; a teacher can cancel any booking on their own slot
  const isOwningStudent = slot.bookedBy?.toString() === userId;
  const isOwningTeacher = role === "teacher" && slot.teacherId.toString() === userId;

  if (!isOwningStudent && !isOwningTeacher) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  slot.status = "open";
  slot.bookedBy = undefined;
  await slot.save();

  return NextResponse.json(slot);
}