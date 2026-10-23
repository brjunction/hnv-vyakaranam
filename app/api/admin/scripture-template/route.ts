import { getCurrentUser } from "@/lib/auth/session";
import { buildScriptureTemplate } from "@/lib/scriptures/template";

// Download a scripture as an .xlsx template: /api/admin/scripture-template?book=sb[&division=123]
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const division = sp.get("division");
  try {
    const { buffer, filename } = await buildScriptureTemplate(sp.get("book") ?? "", division ? Number(division) : undefined);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[scripture-template]", e);
    return new Response("Unknown scripture.", { status: 404 });
  }
}
