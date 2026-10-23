"use server";

import { requireUser } from "@/lib/auth/session";
import { revalidateHnv } from "@/lib/actions/revalidate";
import { importSpreadsheet, type ImportReport } from "@/lib/hnv/spreadsheet";

export type UploadState = { ok: boolean; message: string; report?: ImportReport } | null;

export async function uploadSpreadsheet(_prev: UploadState, form: FormData): Promise<UploadState> {
  const user = await requireUser("editor");
  const edition = String(form.get("edition") ?? "");
  const file = form.get("file");
  const apply = form.get("apply") === "on";
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a spreadsheet file first." };
  if (file.size > 4 * 1024 * 1024) return { ok: false, message: "The file is larger than 4 MB." };
  try {
    const buf = await file.arrayBuffer();
    // Always validate first; only write when the whole sheet is clean.
    const check = await importSpreadsheet(edition, buf, { dryRun: true, userId: user.id });
    if (check.errors.length) return { ok: false, message: `Nothing was changed: fix ${check.errors.length} problem(s) and upload again.`, report: check };
    if (!apply) return { ok: true, message: "Dry run — nothing was changed yet. Tick “Apply the changes” and upload again to save.", report: check };
    const done = await importSpreadsheet(edition, buf, { dryRun: false, userId: user.id });
    revalidateHnv();
    return { ok: true, message: "Saved. The site is updated.", report: done };
  } catch (err) {
    console.error("[uploadSpreadsheet]", err);
    return { ok: false, message: "The upload stopped with an error. Check the file and try again." };
  }
}
