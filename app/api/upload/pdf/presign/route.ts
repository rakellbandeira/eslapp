import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "teacher") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const { fileName, contentType } = await req.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName and contentType are required." }, { status: 400 });
    }

    if (contentType !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const key = `pdfs/${safeName}`;

    // Generate a presigned URL valid for 5 minutes — the browser will PUT
    // the file directly to R2 using this URL, bypassing Vercel entirely
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

    return NextResponse.json({
      presignedUrl,
      fileUrl: `${R2_PUBLIC_URL}/${key}`,
      fileName,
    });
  } catch (err) {
    console.error("Presign error:", err);
    return NextResponse.json({ error: "Could not generate upload URL." }, { status: 500 });
  }
}