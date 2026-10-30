// The vṛtti field holds the Sanskrit vṛtti and, marked lang="en", its English
// translation (from the PDF import). They are shown apart: the Sanskrit under
// the sūtra (italic), the translation among the commentaries (bold, coloured).

const EN_BLOCK = /<(p|h[1-6]|div|table|ul|ol|blockquote)\b[^>]*\blang="en"[^>]*>[\s\S]*?<\/\1>/gi;

export function splitVrtti(html: string): { sanskrit: string; english: string } {
  if (!html || !/lang="en"/i.test(html)) return { sanskrit: html, english: "" };
  const english = (html.match(EN_BLOCK) ?? []).join("");
  const sanskrit = html.replace(EN_BLOCK, "").trim();
  return { sanskrit, english };
}
