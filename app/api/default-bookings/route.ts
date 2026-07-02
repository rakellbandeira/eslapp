import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { DefaultBooking } from "@/models/DefaultBooking";
import { AvailabilityRule } from "@/models/AvailabilityRule";
import { claimExistingOpenSlotsForDefault } from "@/lib/generateSlots";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  await connectDB();

  if (role === "student") {
    const defaults = await DefaultBooking.find({ studentId: userId, isActive: true });
    return NextResponse.json(defaults);
  }

  const defaults = await DefaultBooking.find({ teacherId: userId, isActive: true })
    .populate("studentId", "name email")
    .sort({ dayOfWeek: 1, time: 1 });
  return NextResponse.json(defaults);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "student") {
    return NextResponse.json({ error: "Only students can set a default time." }, { status: 403 });
  }

  const studentId = (session.user as any).id;
  await connectDB();

  try {
    const { teacherId, dayOfWeek, time } = await req.json();

    if (!teacherId || dayOfWeek === undefined || !time) {
      return NextResponse.json(
        { error: "teacherId, dayOfWeek, and time are required." },
        { status: 400 }
      );
    }

    const rules = await AvailabilityRule.find({ teacherId, isActive: true });
    const covered = rules.some((rule) => {
      if (!rule.daysOfWeek.includes(dayOfWeek)) return false;
      return time >= rule.startTime && time < rule.endTime;
    });
    if (!covered) {
      return NextResponse.json(
        { error: "This teacher does not offer classes at that day/time." },
        { status: 400 }
      );
    }

    const conflict = await DefaultBooking.findOne({
      teacherId,
      dayOfWeek,
      time,
      isActive: true,
    });
    if (conflict && conflict.studentId.toString() !== studentId) {
      return NextResponse.json(
        { error: "That time slot is already someone else's default. Please choose another." },
        { status: 409 }
      );
    }

    const defaultBooking = await DefaultBooking.create({
      studentId,
      teacherId,
      dayOfWeek,
      time,
      isActive: true,
    });

    // Immediately claim all already-generated future open slots matching this default —
    // this is the fix for "slot stays open even after a default is set"
    await claimExistingOpenSlotsForDefault(teacherId, studentId, dayOfWeek, time);

    return NextResponse.json(defaultBooking, { status: 201 });
  } catch (err) {
    console.error("Default booking error:", err);
    return NextResponse.json({ error: "Could not set default booking." }, { status: 500 });
  }
}