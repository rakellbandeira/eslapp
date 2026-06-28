import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { slotId } = await params;
  const teacherId = (session.user as any).id;

  await connectDB();

  const slot = await AvailabilitySlot.findById(slotId);
  if (!slot) {
    return NextResponse.json({ error: "Slot not found." }, { status: 404 });
  }
  if (slot.teacherId.toString() !== teacherId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (slot.status === "booked") {
    return NextResponse.json(
      { error: "Cannot delete a booked slot. Cancel the booking first." },
      { status: 400 }
    );
  }

  await AvailabilitySlot.deleteOne({ _id: slotId });
  return NextResponse.json({ success: true });
}