import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";
import { generateSlotsForWindow } from "@/lib/generateSlots";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!teacherId) {
    return NextResponse.json({ error: "teacherId is required." }, { status: 400 });
  }

  await connectDB();

  if (from && to) {
    // Cap generation to 8 weeks ahead from today regardless of what the
    // caller requested — generating a full year (1500+ DB ops) in one
    // serverless function call consistently hits Vercel's 10s timeout.
    // Slots for dates further out will be generated on-demand when the
    // teacher/student actually navigates to that month.
    const generationEnd = new Date();
    generationEnd.setDate(generationEnd.getDate() + 56); // 8 weeks
    const cappedTo = new Date(Math.min(new Date(to).getTime(), generationEnd.getTime()));

    await generateSlotsForWindow(teacherId, new Date(from), cappedTo);
  }

  // Still QUERY the full requested range — slots beyond 8 weeks that were
  // generated in earlier calls (e.g. when the rule was first created) will
  // still be returned. Only generation is capped, not the read.
  const filter: any = { teacherId };
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to) filter.startTime.$lte = new Date(to);
  }

  const slots = await AvailabilitySlot.find(filter)
    .populate("bookedBy", "name email")
    .sort({ startTime: 1 });

  return NextResponse.json(slots);
}