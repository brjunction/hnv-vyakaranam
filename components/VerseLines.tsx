import { splitLines } from "@/lib/text";

/** Renders text with each "/"-separated part on its own line. */
export default function VerseLines({ text, className }: { text?: string | null; className?: string }) {
  const lines = splitLines(text);
  if (lines.length === 0) return null;
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </span>
  );
}
