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
    await generateSlotsForWindow(teacherId, new Date(from), new Date(to));
  }

  const filter: any = { teacherId };
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to) filter.startTime.$lte = new Date(to);
  }

  const slots = await AvailabilitySlot.find(filter)
    .populate("bookedBy", "name email")  // ← this is the fix for problem 3
    .sort({ startTime: 1 });

  return NextResponse.json(slots);
}