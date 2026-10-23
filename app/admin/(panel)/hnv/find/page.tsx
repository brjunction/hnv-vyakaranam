import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { findSutraByNumber, getEdition } from "@/lib/data/hnvAdmin";

// "Go to sūtra" box: /admin/hnv/find?edition=madhyama&n=42
export default async function Find({ searchParams }: { searchParams: Promise<{ edition?: string; n?: string }> }) {
  await requireUser("viewer");
  const { edition = "madhyama", n = "" } = await searchParams;
  const e = await getEdition(edition);
  if (!e) notFound();
  const s = n.trim() ? await findSutraByNumber(e.id, n) : null;
  redirect(s ? `/admin/hnv/sutras/${s.id}` : `/admin/hnv/${e.slug}?missing=${encodeURIComponent(n)}`);
}
