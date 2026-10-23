import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser, hasRole } from "@/lib/auth/session";

// Issues short-lived upload tokens so the browser can send dictionary files
// (often many MB) straight to Vercel Blob, bypassing the 4.5 MB request limit.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (!user || !hasRole(user, "editor")) throw new Error("Not allowed");
        if (!pathname.startsWith("dict/")) throw new Error("Bad path");
        return { addRandomSuffix: true, maximumSizeInBytes: 500 * 1024 * 1024 };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
