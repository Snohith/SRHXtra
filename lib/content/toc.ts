export interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

export function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

export function extractHeadings(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();

  for (const line of markdown.split("\n")) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!match) continue;

    const depth = match[1].length;
    const text = stripInlineMarkdown(match[2]);
    if (!text || /source note/i.test(text)) continue;

    let base = slugifyHeading(text) || `section-${headings.length + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count > 0) base = `${base}-${count + 1}`;

    headings.push({ id: base, text, depth });
  }

  return headings;
}
