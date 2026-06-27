import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Submodule } from "@/models/Submodule";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ submoduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { submoduleId } = await params;

  await connectDB();
  const submodule = await Submodule.findById(submoduleId);

  if (!submodule) {
    return NextResponse.json({ error: "Submodule not found." }, { status: 404 });
  }

  return NextResponse.json(submodule);
}