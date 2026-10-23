import { getCurrentUser } from "@/lib/auth/session";
import { buildTemplate } from "@/lib/hnv/spreadsheet";

// Download an edition's sūtras as an .xlsx template: /api/admin/hnv-template?edition=madhyama
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const edition = new URL(req.url).searchParams.get("edition") ?? "madhyama";
  try {
    const { buffer, filename } = await buildTemplate(edition);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Unknown edition.", { status: 404 });
  }
}
