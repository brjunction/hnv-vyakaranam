"use client";

import { useState, useTransition } from "react";
import { setFeature } from "@/lib/actions/features";

type F = { key: string; name: string; blurb: string; on: boolean };

export default function FeatureSwitches({ features }: { features: F[] }) {
  const [list, setList] = useState(features);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <ul className="mt-6 grid gap-3">
      {list.map((f) => (
        <li key={f.key} className="a-card flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium">{f.name}</p>
            <p className="text-sm text-[var(--a-fg-muted)]">{f.blurb}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={f.on}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const now = await setFeature(f.key, !f.on);
                setList((l) => l.map((x) => ({ ...x, on: !!(now as Record<string, boolean>)[x.key] })));
                setMsg(`${f.name}: ${!f.on ? "on — live on the website" : "off — hidden"}.`);
              })
            }
            className={`a-btn shrink-0 ${f.on ? "a-btn-primary" : "a-btn-outline"}`}
          >
            {f.on ? "On" : "Turn on"}
          </button>
        </li>
      ))}
      {msg && <p className="text-sm">{msg}</p>}
    </ul>
  );
}
