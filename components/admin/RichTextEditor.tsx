"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
  Bold, Italic, Underline, Strikethrough, Subscript as SubIcon, Superscript as SupIcon, Highlighter, Palette,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Quote, Link as LinkIcon, Unlink,
  ImagePlus, Table as TableIcon, Minus, Undo2, Redo2, RemoveFormatting, Heading2, Heading3, Pilcrow,
  BetweenHorizontalStart, BetweenHorizontalEnd, BetweenVerticalStart, BetweenVerticalEnd, Rows3, Columns3,
  Trash2, TableCellsMerge, TableCellsSplit, PanelTop, Maximize2, Minimize2,
} from "lucide-react";
import { isHtml } from "@/components/RichText";

// Rich-text editor for vṛtti, translation and commentaries. Produces HTML
// (stored in a hidden <input name={name}>, so it submits with the form) —
// the server sanitizes it again before saving (lib/html/sanitize.ts).

const TEXT_COLORS = ["#1f2937", "#b91c1c", "#c2410c", "#a16207", "#15803d", "#1d4ed8", "#7e22ce", "#be185d"];
const HIGHLIGHTS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"];
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/** Plain text from before the database (or a spreadsheet) → paragraphs. */
function toInitialHtml(value: string): string {
  if (!value.trim()) return "";
  if (isHtml(value)) return value;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return value
    .split(/\n{2,}/)
    .map((para) => `<p>${esc(para).replace(/\n|\s\/\s/g, "<br>")}</p>`)
    .join("");
}

async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
  return data.url;
}

function Btn({
  onClick, active, disabled, title, children,
}: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition-colors disabled:opacity-35 ${
        active ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "hover:bg-[var(--bg-2)] text-[var(--fg)]"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-6 w-px bg-[var(--border)]" aria-hidden />;

function Toolbar({
  editor, onPickImage, uploading, full, setFull,
}: { editor: Editor; onPickImage: () => void; uploading: boolean; full: boolean; setFull: (v: boolean) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
      strike: e.isActive("strike"), sub: e.isActive("subscript"), sup: e.isActive("superscript"),
      h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"), ordered: e.isActive("orderedList"), quote: e.isActive("blockquote"),
      link: e.isActive("link"), table: e.isActive("table"),
      left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }), justify: e.isActive({ textAlign: "justify" }),
      canUndo: e.can().undo(), canRedo: e.can().redo(),
      canMerge: e.can().mergeCells(), canSplit: e.can().splitCell(),
    }),
  });
  const [palette, setPalette] = useState<"color" | "highlight" | null>(null);
  const c = () => editor.chain().focus();

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (https://…)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") return void c().extendMarkRange("link").unsetLink().run();
    c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] rounded-t-lg">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">
        <Btn title="Undo" onClick={() => c().undo().run()} disabled={!s.canUndo}><Undo2 size={16} /></Btn>
        <Btn title="Redo" onClick={() => c().redo().run()} disabled={!s.canRedo}><Redo2 size={16} /></Btn>
        <Sep />
        <Btn title="Normal text" onClick={() => c().setParagraph().run()}><Pilcrow size={16} /></Btn>
        <Btn title="Heading" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></Btn>
        <Btn title="Sub-heading" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></Btn>
        <Sep />
        <Btn title="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><Bold size={16} /></Btn>
        <Btn title="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic size={16} /></Btn>
        <Btn title="Underline" active={s.underline} onClick={() => c().toggleUnderline().run()}><Underline size={16} /></Btn>
        <Btn title="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough size={16} /></Btn>
        <Btn title="Subscript" active={s.sub} onClick={() => c().toggleSubscript().run()}><SubIcon size={16} /></Btn>
        <Btn title="Superscript" active={s.sup} onClick={() => c().toggleSuperscript().run()}><SupIcon size={16} /></Btn>
        <span className="relative">
          <Btn title="Text colour" active={palette === "color"} onClick={() => setPalette(palette === "color" ? null : "color")}>
            <Palette size={16} />
          </Btn>
          <Btn title="Highlight" active={palette === "highlight"} onClick={() => setPalette(palette === "highlight" ? null : "highlight")}>
            <Highlighter size={16} />
          </Btn>
          {palette && (
            <span className="absolute left-0 top-9 z-20 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
              {(palette === "color" ? TEXT_COLORS : HIGHLIGHTS).map((col) => (
                <button
                  key={col}
                  type="button"
                  title={col}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (palette === "color") c().setColor(col).run();
                    else c().toggleHighlight({ color: col }).run();
                    setPalette(null);
                  }}
                  className="h-6 w-6 rounded border border-black/10"
                  style={{ background: col }}
                />
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (palette === "color") c().unsetColor().run();
                  else c().unsetHighlight().run();
                  setPalette(null);
                }}
                className="ml-1 rounded px-2 text-xs hover:bg-[var(--bg-2)]"
              >
                None
              </button>
            </span>
          )}
        </span>
        <Sep />
        <Btn title="Align left" active={s.left} onClick={() => c().setTextAlign("left").run()}><AlignLeft size={16} /></Btn>
        <Btn title="Centre" active={s.center} onClick={() => c().setTextAlign("center").run()}><AlignCenter size={16} /></Btn>
        <Btn title="Align right" active={s.right} onClick={() => c().setTextAlign("right").run()}><AlignRight size={16} /></Btn>
        <Btn title="Justify" active={s.justify} onClick={() => c().setTextAlign("justify").run()}><AlignJustify size={16} /></Btn>
        <Sep />
        <Btn title="Bulleted list" active={s.bullet} onClick={() => c().toggleBulletList().run()}><List size={16} /></Btn>
        <Btn title="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
        <Btn title="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote size={16} /></Btn>
        <Btn title="Divider line" onClick={() => c().setHorizontalRule().run()}><Minus size={16} /></Btn>
        <Sep />
        <Btn title="Link" active={s.link} onClick={setLink}><LinkIcon size={16} /></Btn>
        {s.link && <Btn title="Remove link" onClick={() => c().unsetLink().run()}><Unlink size={16} /></Btn>}
        <Btn title={uploading ? "Uploading…" : "Insert picture"} onClick={onPickImage} disabled={uploading}>
          <ImagePlus size={16} />
        </Btn>
        <Btn title="Insert table" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon size={16} />
        </Btn>
        <Sep />
        <Btn title="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={16} /></Btn>
        <Btn title={full ? "Exit full screen" : "Full screen"} onClick={() => setFull(!full)}>
          {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Btn>
      </div>

      {s.table && (
        <div className="flex flex-wrap items-center gap-0.5 border-t border-[var(--border)] bg-[var(--bg-2)] p-1.5 text-xs">
          <span className="px-2 font-semibold text-[var(--fg-muted)]">Table</span>
          <Btn title="Row above" onClick={() => c().addRowBefore().run()}><BetweenHorizontalStart size={16} /></Btn>
          <Btn title="Row below" onClick={() => c().addRowAfter().run()}><BetweenHorizontalEnd size={16} /></Btn>
          <Btn title="Delete row" onClick={() => c().deleteRow().run()}><Rows3 size={16} /></Btn>
          <Sep />
          <Btn title="Column left" onClick={() => c().addColumnBefore().run()}><BetweenVerticalStart size={16} /></Btn>
          <Btn title="Column right" onClick={() => c().addColumnAfter().run()}><BetweenVerticalEnd size={16} /></Btn>
          <Btn title="Delete column" onClick={() => c().deleteColumn().run()}><Columns3 size={16} /></Btn>
          <Sep />
          <Btn title="Merge cells" disabled={!s.canMerge} onClick={() => c().mergeCells().run()}><TableCellsMerge size={16} /></Btn>
          <Btn title="Split cell" disabled={!s.canSplit} onClick={() => c().splitCell().run()}><TableCellsSplit size={16} /></Btn>
          <Btn title="Header row on/off" onClick={() => c().toggleHeaderRow().run()}><PanelTop size={16} /></Btn>
          <Sep />
          <Btn title="Delete table" onClick={() => c().deleteTable().run()}><Trash2 size={16} /></Btn>
        </div>
      )}
    </div>
  );
}

export default function RichTextEditor({
  name,
  defaultValue = "",
  placeholder,
  minHeight = 140,
  devanagari = false,
}: {
  /** Form field name; the HTML is submitted under it. */
  name: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: number;
  /** Use the Devanagari font for the body (vṛtti). */
  devanagari?: boolean;
}) {
  const initial = toInitialHtml(defaultValue);
  const [html, setHtml] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const insertFiles = useCallback(async (files: File[]) => {
    const images = files.filter((f) => ACCEPT.split(",").includes(f.type));
    if (!images.length || !editorRef.current) return false;
    setUploading(true);
    setError(null);
    try {
      for (const f of images) {
        const src = await uploadImage(f);
        editorRef.current.chain().focus().setImage({ src, alt: f.name.replace(/\.[^.]+$/, "") }).run();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
    return true;
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ resize: { enabled: true, minWidth: 60, minHeight: 40, alwaysPreserveAspectRatio: true } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: `rich-content rich-editor focus:outline-none px-4 py-3 ${devanagari ? "font-devanagari" : ""}`,
        "data-placeholder": placeholder ?? "",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          void insertFiles(files);
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          void insertFiles(files);
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
    },
    onUpdate: ({ editor: e }) => setHtml(e.isEmpty ? "" : e.getHTML()),
  });

  return (
    <div
      className={
        full
          ? "fixed inset-0 z-50 flex flex-col bg-[var(--bg)] p-3 sm:p-6"
          : "rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] focus-within:border-[var(--ring)] focus-within:ring-2 focus-within:ring-[var(--ring)]/25"
      }
    >
      <input type="hidden" name={name} value={html} />
      <div className={full ? "flex flex-1 flex-col overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--surface)]" : ""}>
        {editor ? (
          <Toolbar
            editor={editor}
            uploading={uploading}
            onPickImage={() => fileRef.current?.click()}
            full={full}
            setFull={setFull}
          />
        ) : (
          <div className="h-11 border-b border-[var(--border)]" />
        )}
        <div className={full ? "flex-1 overflow-y-auto" : ""} style={full ? undefined : { minHeight }}>
          <EditorContent editor={editor} />
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          void insertFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {(uploading || error) && (
        <p className={`px-3 py-1.5 text-xs ${error ? "text-[var(--danger)]" : "text-[var(--fg-muted)]"}`}>
          {error ?? "Uploading picture…"}
        </p>
      )}
    </div>
  );
}
