import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { mediaFiles } from "@/lib/db/schema";

// Image upload for the admin rich-text editor. Files go to Vercel Blob
// (public URLs); a row in media_files records who uploaded what.
// Middleware does not cover /api, so this route checks the session itself.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB bodies
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "contributor")) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Picture storage is not configured (BLOB_READ_WRITE_TOKEN)." }, { status: 500 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No file received." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a PNG, JPEG, WebP or GIF picture." }, { status: 415 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Pictures must be 4 MB or smaller — please resize it first." }, { status: 413 });
  }

  const base =
    file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/\p{M}+/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "image";
  const month = new Date().toISOString().slice(0, 7);

  try {
    const blob = await put(`hnv/${month}/${base}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    await getDb().insert(mediaFiles).values({
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
      alt: base,
      uploadedBy: user.id,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "The upload failed. Please try again." }, { status: 500 });
  }
}
