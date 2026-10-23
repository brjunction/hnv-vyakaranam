import { BookA, ExternalLink } from "lucide-react";

/** Opens the Sanskrit dictionary in a new tab, so the reader keeps their place. */
export default function DictButton() {
  return (
    <a href="/tools/dictionary/search" target="_blank" rel="noopener" className="ui-btn" title="Open the Sanskrit dictionary in a new tab">
      <BookA size={15} /> <span className="hidden sm:inline">Dictionary</span>
      <ExternalLink size={12} className="text-[var(--fg-muted)]" />
    </a>
  );
}
