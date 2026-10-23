import VerseLines from "@/components/VerseLines";

/** True when a stored field holds HTML from the admin editor (vs. older plain text). */
export function isHtml(value: string | null | undefined): boolean {
  return /^\s*<[a-z][\s\S]*>/i.test(value ?? "");
}

/**
 * Renders a rich-text field. HTML was sanitized on the server when it was
 * saved (lib/html/sanitize.ts), so it is safe to insert as-is. Older plain
 * text keeps working, with "/" as a line break.
 */
export default function RichText({ value, className = "" }: { value?: string | null; className?: string }) {
  if (!value?.trim()) return null;
  if (isHtml(value)) {
    return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return (
    <div className={className}>
      <VerseLines text={value} />
    </div>
  );
}
