import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { AvailabilityRule } from "@/models/AvailabilityRule";
import { generateSlotsForWindow } from "@/lib/generateSlots";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await connectDB();
  const rules = await AvailabilityRule.find({ teacherId: (session.user as any).id }).sort({ createdAt: -1 });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const teacherId = (session.user as any).id;
  await connectDB();

  try {
    const { daysOfWeek, startTime, endTime, slotDurationMinutes, ruleStartDate, ruleEndDate } = await req.json();

    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return NextResponse.json({ error: "Select at least one day of the week." }, { status: 400 });
    }
    if (!startTime || !endTime || !ruleStartDate || !ruleEndDate) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const rule = await AvailabilityRule.create({
      teacherId,
      daysOfWeek,
      startTime,
      endTime,
      slotDurationMinutes: slotDurationMinutes || 60,
      ruleStartDate: new Date(ruleStartDate),
      ruleEndDate: new Date(ruleEndDate),
      isActive: true,
    });

    // Eagerly generate the first 8 weeks right away, so the teacher/students
    // see real slots immediately rather than waiting for a later page load.
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + 56);
    await generateSlotsForWindow(teacherId, new Date(ruleStartDate), windowEnd);

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    console.error("Rule creation error:", err);
    return NextResponse.json({ error: "Could not create rule." }, { status: 500 });
  }
}