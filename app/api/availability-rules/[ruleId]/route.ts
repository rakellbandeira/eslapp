import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { AvailabilityRule } from "@/models/AvailabilityRule";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { ruleId } = await params;
  const teacherId = (session.user as any).id;

  await connectDB();
  const rule = await AvailabilityRule.findById(ruleId);
  if (!rule || rule.teacherId.toString() !== teacherId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { isActive } = await req.json();
  rule.isActive = isActive;
  await rule.save();

  return NextResponse.json(rule);
}