import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Module } from "@/models/Module";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { moduleId } = await params;

  await connectDB();
  const courseModule = await Module.findById(moduleId);

  if (!courseModule) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  return NextResponse.json(courseModule);
}