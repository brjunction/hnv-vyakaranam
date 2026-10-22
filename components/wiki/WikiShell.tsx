"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenText, X } from "lucide-react";

/**
 * Hosts the wiki's HTML + script inside the site layout, and adds a mobile
 * drawer for the wiki's section list. The wiki's own script defines global
 * functions (show, toggleGroup, filterNav …) used by its inline onclick
 * attributes; it runs once after the HTML is in the DOM.
 */
export default function WikiShell({ css, html, js }: { css: string; html: string; js: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el || el.dataset.ready) return;
    el.dataset.ready = "1";
    const s = document.createElement("script");
    s.textContent = js;
    document.body.appendChild(s);
    // Close the mobile drawer whenever a section is chosen.
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".nav-items a")) setDrawer(false);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [js]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <button
        type="button"
        onClick={() => setDrawer((d) => !d)}
        className="wiki-drawer-btn lg:hidden fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full bg-[var(--accent)] text-[var(--color-ink)] px-5 py-3 text-sm font-semibold shadow-lg"
        aria-expanded={drawer}
        aria-controls="sidebar"
      >
        {drawer ? <X size={18} /> : <BookOpenText size={18} />}
        {drawer ? "Close" : "Sections"}
      </button>
      {drawer && <div className="lg:hidden fixed inset-0 z-[45] bg-black/40" onClick={() => setDrawer(false)} aria-hidden />}
      <div ref={host} className="hnv-wiki" data-drawer={drawer ? "open" : "closed"} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
