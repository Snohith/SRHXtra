/**
 * Client-side diff helpers for the revision compare view.
 *
 * Two levels:
 *  - `diffWords` aligns token runs (LCS) and marks each as same/add/remove.
 *  - `diffBlocks` splits rich-text HTML into block elements, aligns the
 *    blocks, and pairs changed blocks for an inline word-level diff so a
 *    one-paragraph edit reads as a small inline change, not a whole-block
 *    replacement.
 *
 * Both fall back to coarse "whole thing changed" output for pathologically
 * large inputs so the UI never locks up.
 */

export type DiffType = "same" | "add" | "remove";

export interface WordDiff {
  type: DiffType;
  text: string;
}

export interface BlockDiff {
  kind: "same" | "add" | "remove" | "change";
  /** Rendered HTML for same/add/remove blocks. */
  html?: string;
  /** Present on `change` blocks (kept for tooltips/inspection). */
  oldHtml?: string;
  newHtml?: string;
  /** Inline word diff for `change` blocks. */
  words?: WordDiff[];
  key: string;
}

const MAX_WORD_MATRIX = 1_000_000;
const MAX_BLOCK_MATRIX = 250_000;

interface Tok {
  /** Comparison key (token without trailing whitespace). */
  key: string;
  /** Display text (token with its original trailing whitespace). */
  text: string;
}

/**
 * Tokenize into non-space runs + trailing whitespace so joins stay stable.
 * Comparison uses the trimmed key ("fixture" == "fixture ") while rendering
 * keeps the original spacing — otherwise a plain append would show the last
 * word as both removed and re-added.
 */
function tokenize(text: string): Tok[] {
  const raw = text.match(/\S+\s*/g) ?? (text ? [text] : []);
  return raw.map((t) => ({ key: t.trimEnd(), text: t }));
}

/** Classic LCS alignment over token arrays (keys compared, target text kept). */
function lcs(a: Tok[], b: Tok[]): WordDiff[] {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) {
    return [
      ...a.map<WordDiff>((t) => ({ type: "remove", text: t.text })),
      ...b.map<WordDiff>((t) => ({ type: "add", text: t.text })),
    ];
  }
  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        a[i].key === b[j].key
          ? dp[(i + 1) * w + (j + 1)] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + (j + 1)]);
    }
  }
  const out: WordDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i].key === b[j].key) {
      // Keep the target side's spacing for "same" runs.
      out.push({ type: "same", text: b[j].text });
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + (j + 1)]) {
      out.push({ type: "remove", text: a[i].text });
      i++;
    } else {
      out.push({ type: "add", text: b[j].text });
      j++;
    }
  }
  while (i < n) out.push({ type: "remove", text: a[i++].text });
  while (j < m) out.push({ type: "add", text: b[j++].text });
  return out;
}

/** Merge adjacent runs of the same type so rendering emits fewer nodes. */
function coalesce(ops: WordDiff[]): WordDiff[] {
  const out: WordDiff[] = [];
  for (const op of ops) {
    const last = out[out.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else out.push({ type: op.type, text: op.text });
  }
  return out;
}

/** Word-level diff of two plain strings. */
export function diffWords(oldText: string, newText: string): WordDiff[] {
  if (oldText === newText) return [{ type: "same", text: oldText }];
  const a = tokenize(oldText);
  const b = tokenize(newText);
  if (
    a.length * b.length > MAX_WORD_MATRIX ||
    typeof Uint32Array === "undefined"
  ) {
    return [
      { type: "remove", text: oldText },
      { type: "add", text: newText },
    ];
  }
  return coalesce(lcs(a, b));
}

const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "DIV",
  "FIGURE",
  "TABLE",
  "SECTION",
  "ARTICLE",
  "HR",
  "IFRAME",
  "IMG",
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Split rich-text HTML into top-level block strings (inline runs stay together). */
function splitBlocks(html: string): string[] {
  if (!html.trim()) return [];
  if (typeof DOMParser === "undefined") return [html];
  const doc = new DOMParser().parseFromString(
    `<div id="srh-diff-root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("srh-diff-root");
  if (!root) return [html];
  const blocks: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const joined = buffer.join("").trim();
    if (joined) blocks.push(joined);
    buffer = [];
  };
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === 1) {
      const el = node as Element;
      if (BLOCK_TAGS.has(el.tagName)) {
        flush();
        blocks.push(el.outerHTML);
      } else {
        buffer.push(el.outerHTML);
      }
    } else if (node.nodeType === 3) {
      const text = node.textContent ?? "";
      if (text.trim()) buffer.push(escapeHtml(text));
    }
  }
  flush();
  return blocks.length > 0 ? blocks : [html];
}

/** Plain text of a block (for word-level diffing). */
function htmlToText(html: string): string {
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, " ");
  const doc = new DOMParser().parseFromString(
    `<div>${html}</div>`,
    "text/html",
  );
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Block-level diff of two rich-text bodies with inline word diffs. */
export function diffBlocks(oldHtml: string, newHtml: string): BlockDiff[] {
  const a = splitBlocks(oldHtml);
  const b = splitBlocks(newHtml);
  if (a.length * b.length > MAX_BLOCK_MATRIX) {
    return [
      { kind: "remove", html: oldHtml, key: "r0" },
      { kind: "add", html: newHtml, key: "a0" },
    ];
  }
  const ops = lcs(
    a.map((html) => ({ key: html, text: html })),
    b.map((html) => ({ key: html, text: html })),
  );
  const out: BlockDiff[] = [];
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === "same") {
      out.push({ kind: "same", html: ops[i].text, key: `s${i}` });
      i++;
      continue;
    }
    // Collect a run of removes/adds, then pair them index-wise into changes.
    const removes: string[] = [];
    const adds: string[] = [];
    while (i < ops.length && ops[i].type !== "same") {
      if (ops[i].type === "remove") removes.push(ops[i].text);
      else adds.push(ops[i].text);
      i++;
    }
    const paired = Math.min(removes.length, adds.length);
    for (let k = 0; k < paired; k++) {
      out.push({
        kind: "change",
        oldHtml: removes[k],
        newHtml: adds[k],
        words: diffWords(htmlToText(removes[k]), htmlToText(adds[k])),
        key: `c${i}-${k}`,
      });
    }
    for (let k = paired; k < removes.length; k++)
      out.push({ kind: "remove", html: removes[k], key: `r${i}-${k}` });
    for (let k = paired; k < adds.length; k++)
      out.push({ kind: "add", html: adds[k], key: `a${i}-${k}` });
  }
  return out;
}

/** True when a block diff contains any change at all. */
export function hasBlockChanges(blocks: BlockDiff[]): boolean {
  return blocks.some((b) => b.kind !== "same");
}
