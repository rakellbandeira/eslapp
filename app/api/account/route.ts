import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = (session.user as any).id;
  await connectDB();

  try {
    const { email, currentPassword, newPassword } = await req.json();

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to make changes." },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    // Check new email isn't already taken by someone else
    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) {
        return NextResponse.json(
          { error: "That email is already in use by another account." },
          { status: 409 }
        );
      }
      user.email = email;
    }

    if (newPassword) {
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account update error:", err);
    return NextResponse.json({ error: "Could not update account." }, { status: 500 });
  }
}