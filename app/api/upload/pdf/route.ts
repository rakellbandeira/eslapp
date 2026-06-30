import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `pdfs/${safeName}`,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );

    return NextResponse.json({
      fileUrl: `${R2_PUBLIC_URL}/pdfs/${safeName}`,
      fileName: file.name,
    });
  } catch (err) {
    console.error("R2 upload error:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}