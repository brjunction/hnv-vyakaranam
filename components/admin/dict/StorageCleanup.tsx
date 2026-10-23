"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { cleanStorage, scanStorage, type StorageScan } from "@/lib/actions/dictionaries";

/** Shows storage use and removes leftovers (macOS metadata, failed attempts). */
export default function StorageCleanup() {
  const router = useRouter();
  const [scan, setScan] = useState<StorageScan | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => scanStorage().then(setScan).catch(() => setScan(null));
  useEffect(() => {
    void load();
  }, []);

  if (!scan) return <p className="text-sm text-[var(--a-fg-muted)]">Checking storage…</p>;
  const leftovers = scan.junk.count + scan.incomplete.reduce((n, g) => n + Object.keys(g.refs).length, 0);
  const leftoverMb = (scan.junk.bytes + scan.incomplete.reduce((n, g) => n + g.bytes, 0)) / 1048576;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
      <span>
        <span className="font-medium">{(scan.usedBytes / 1073741824).toFixed(2)} GB</span>
        <span className="text-[var(--a-fg-muted)]"> of 5 GB used</span>
      </span>
      {scan.pending.length > 0 && (
        <span className="text-[var(--a-fg-muted)]">
          {scan.pending.length} uploaded dictionar{scan.pending.length === 1 ? "y is" : "ies are"} not added yet — choose the same folder again
          above to add them (nothing is uploaded twice).
        </span>
      )}
      {leftovers > 0 ? (
        <button
          className="a-btn a-btn-outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await cleanStorage();
            setMsg(r.message);
            await load();
            setBusy(false);
            router.refresh();
          }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          Remove {leftovers} leftover files ({leftoverMb.toFixed(1)} MB)
        </button>
      ) : (
        <span className="text-[var(--a-fg-muted)]">No leftover files.</span>
      )}
      {msg && <span className="text-[var(--a-success)]">{msg}</span>}
    </div>
  );
}
