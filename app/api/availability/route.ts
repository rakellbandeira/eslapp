import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { AvailabilitySlot } from "@/models/AvailabilitySlot";

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

  const filter: any = { teacherId };
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to) filter.startTime.$lte = new Date(to);
  }

  const slots = await AvailabilitySlot.find(filter).sort({ startTime: 1 });
  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Only teachers can create availability." }, { status: 403 });
  }

  const teacherId = (session.user as any).id;

  await connectDB();

  try {
    const { startTime, endTime } = await req.json();

    if (!startTime || !endTime) {
      return NextResponse.json({ error: "startTime and endTime are required." }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json({ error: "endTime must be after startTime." }, { status: 400 });
    }

    const slot = await AvailabilitySlot.create({
      teacherId,
      startTime: start,
      endTime: end,
      status: "open",
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (err) {
    console.error("Availability creation error:", err);
    return NextResponse.json({ error: "Could not create slot." }, { status: 500 });
  }
}