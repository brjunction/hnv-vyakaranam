import type { Metadata } from "next";
import { getMiscDoc } from "@/lib/miscDoc";

export const metadata: Metadata = {
  title: "More",
  description: "Miscellaneous — occasional blogs and reading for students of Hari-nāmāmṛta Vyākaraṇa.",
};

// Rendered fresh on every request so Google Doc edits appear immediately.
export const dynamic = "force-dynamic";

export default async function More() {
  const doc = await getMiscDoc();

  return (
    <div className="max-w-5xl mx-auto px-5 py-16">
      {doc.styleCss && <style dangerouslySetInnerHTML={{ __html: doc.styleCss }} />}

      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">More</p>
      <h1 className="text-3xl sm:text-4xl font-semibold mb-4">Further resources</h1>
      <p className="text-[var(--fg-muted)] mb-12 max-w-xl">
        Occasional blogs and reading, in progress.
      </p>

      {doc.sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--fg-muted)]">
          Nothing published here yet — content is pulled live from the Miscellaneous Google Doc
          once its link is added to <code>lib/config.ts</code>.
        </div>
      ) : (
        <div className="space-y-16">
          {doc.sections.map((section) => (
            <section key={section.key}>
              <h2 className="text-2xl font-semibold mb-6">{section.title}</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {section.extras.map((extra) => (
                  <article
                    key={extra.key}
                    className="rounded-xl border border-[var(--border)] overflow-hidden flex flex-col"
                  >
                    {extra.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={extra.image} alt={extra.title} className="w-full h-44 object-cover" />
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="font-medium text-lg mb-1">{extra.title}</h3>
                      {extra.subtitle && (
                        <p className="text-sm text-[var(--fg-muted)] mb-4">{extra.subtitle}</p>
                      )}
                      {/*
                        Rendered exactly as formatted in the Google Doc — the
                        scoped <style> above supplies the real
                        colors/alignment/fonts Google Docs assigned.
                      */}
                      <div
                        className={`gdoc-content ${doc.scopeClass} text-sm leading-relaxed`}
                        dangerouslySetInnerHTML={{ __html: extra.bodyHtml }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
