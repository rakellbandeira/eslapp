import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";

// Frees up a SINGLE occurrence the student currently holds (default or one-off)
// and immediately books a different open slot in its place — both in one
// request, so the student is never left without a class mid-swap.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "student") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { slotId: oldSlotId } = await params;
  const studentId = (session.user as any).id;

  await connectDB();

  try {
    const { newSlotId } = await req.json();
    if (!newSlotId) {
      return NextResponse.json({ error: "newSlotId is required." }, { status: 400 });
    }

    const oldSlot = await AvailabilitySlot.findById(oldSlotId);
    if (!oldSlot || oldSlot.bookedBy?.toString() !== studentId) {
      return NextResponse.json({ error: "You don't hold that booking." }, { status: 403 });
    }

    // Atomically claim the new slot first — if this fails, we haven't touched the old one yet
    const newSlot = await AvailabilitySlot.findOneAndUpdate(
      { _id: newSlotId, status: "open" },
      { status: "booked", bookedBy: studentId, isDefaultBooking: false },
      { new: true }
    );

    if (!newSlot) {
      return NextResponse.json(
        { error: "That time was just taken by someone else. Please pick another." },
        { status: 409 }
      );
    }

    // Only release the old one-time occurrence after the new one is secured.
    // If this is a default-booking occurrence, we free just THIS slot, not the
    // standing DefaultBooking record — the student keeps their default going forward.
    oldSlot.status = "open";
    oldSlot.bookedBy = undefined;
    oldSlot.isDefaultBooking = false;
    await oldSlot.save();

    return NextResponse.json({ oldSlot, newSlot });
  } catch (err) {
    console.error("Swap error:", err);
    return NextResponse.json({ error: "Could not swap booking." }, { status: 500 });
  }
}