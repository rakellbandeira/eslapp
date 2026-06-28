import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const studentId = (session.user as any).id;

  await connectDB();

  const bookings = await AvailabilitySlot.find({ bookedBy: studentId, status: "booked" })
    .populate("teacherId", "name email")
    .sort({ startTime: 1 });

  return NextResponse.json(bookings);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "student") {
    return NextResponse.json({ error: "Only students can book classes." }, { status: 403 });
  }

  const studentId = (session.user as any).id;

  await connectDB();

  try {
    const { slotId } = await req.json();
    if (!slotId) {
      return NextResponse.json({ error: "slotId is required." }, { status: 400 });
    }

    const targetSlot = await AvailabilitySlot.findById(slotId);
    if (!targetSlot) {
      return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    }

    // Enforce "one booking per student per week" — check for any existing booking
    // by this student whose startTime falls in the same week as the target slot.
    const startOfWeek = new Date(targetSlot.startTime);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const existingThisWeek = await AvailabilitySlot.findOne({
      bookedBy: studentId,
      status: "booked",
      startTime: { $gte: startOfWeek, $lt: endOfWeek },
    });

    if (existingThisWeek) {
      return NextResponse.json(
        { error: "You already have a class booked this week." },
        { status: 409 }
      );
    }

    // THE ATOMIC PART: findOneAndUpdate with a condition on the CURRENT state.
    // If two requests race, only the first one to reach MongoDB will match
    // { status: "open" } — by the time the second one runs, status is already
    // "booked", so the filter matches nothing and result comes back null.
    const result = await AvailabilitySlot.findOneAndUpdate(
      { _id: slotId, status: "open" },
      { status: "booked", bookedBy: studentId },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { error: "This slot was just booked by someone else. Please pick another time." },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Could not book slot." }, { status: 500 });
  }
}