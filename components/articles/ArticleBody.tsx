import { withBasePath } from "@/lib/utils/paths";
import { extractHeadings, slugifyHeading } from "@/lib/content/toc";
import type { Content, InlineCode, Link, List, ListItem, Paragraph, PhrasingContent, Root, Table, TableCell } from "mdast";
import type { ReactNode } from "react";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

interface ArticleBodyProps {
  content: string;
  dropCap?: boolean;
}

interface RenderContext {
  headingCursor: number;
  headingIds: string[];
  paragraphIndex: number;
  dropCap: boolean;
}

function plainText(children: PhrasingContent[]): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value;
      if ("children" in child && Array.isArray((child as { children?: unknown }).children)) {
        return plainText((child as unknown as { children: PhrasingContent[] }).children);
      }
      return "";
    })
    .join("");
}

function renderInline(node: PhrasingContent, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return node.value;
    case "emphasis":
      return <em key={key}>{node.children.map((child, index) => renderInline(child, `${key}-${index}`))}</em>;
    case "strong":
      return <strong key={key} className="font-semibold text-foreground">{node.children.map((child, index) => renderInline(child, `${key}-${index}`))}</strong>;
    case "delete":
      return <del key={key}>{node.children.map((child, index) => renderInline(child, `${key}-${index}`))}</del>;
    case "inlineCode":
      return (
        <code
          key={key}
          className="rounded-md border border-border bg-black/[0.03] px-1.5 py-0.5 font-mono text-[0.92em] text-accent"
        >
          {(node as InlineCode).value}
        </code>
      );
    case "link": {
      const linkNode = node as Link;
      const isExternal = /^https?:\/\//.test(linkNode.url);
      const href = isExternal ? linkNode.url : withBasePath(linkNode.url);

      return (
        <a
          key={key}
          className="font-medium text-accent underline decoration-accent/40 underline-offset-4 transition hover:text-accent/80"
          href={href}
          rel={isExternal ? "noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
        >
          {linkNode.children.map((child, index) => renderInline(child, `${key}-${index}`))}
        </a>
      );
    }
    case "break":
      return <br key={key} />;
    default:
      return null;
  }
}

function renderTableCell(
  cell: TableCell,
  key: string,
  align?: "left" | "right" | "center" | null,
  isHeader = false,
) {
  const Tag = isHeader ? "th" : "td";
  const alignment = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <Tag
      key={key}
      className={`border border-border px-4 py-3 align-top text-sm leading-7 ${alignment} ${isHeader ? "bg-black/[0.02] font-semibold text-foreground" : "text-muted"}`}
    >
      {cell.children.map((child, index) => renderInline(child as Paragraph["children"][number], `${key}-${index}`))}
    </Tag>
  );
}

function renderListItem(item: ListItem, key: string, ctx: RenderContext) {
  return (
    <li key={key} className="pl-1">
      <div className="grid gap-3">
        {item.children.map((child, index) => renderBlock(child, `${key}-${index}`, ctx))}
      </div>
    </li>
  );
}

function renderBlock(node: Content, key: string, ctx: RenderContext): ReactNode {
  switch (node.type) {
    case "heading": {
      const text =
        "children" in node && Array.isArray(node.children)
          ? plainText(node.children as PhrasingContent[])
          : "";
      const isSourceNote = /source note/i.test(text);
      const consumesTocId = !isSourceNote && (node.depth === 2 || node.depth === 3);
      const id = isSourceNote
        ? "source-note"
        : consumesTocId
          ? (ctx.headingIds[ctx.headingCursor++] ?? slugifyHeading(text) ?? key)
          : (slugifyHeading(text) ?? key);

      if (isSourceNote) {
        return (
          <aside
            key={key}
            id={id}
            aria-label="Sources"
            className="scroll-mt-32 rounded-3xl border border-dashed border-border-strong/60 bg-surface px-7 py-6 sm:px-8"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
              Sources & attribution
            </p>
          </aside>
        );
      }

      if (node.depth === 2) {
        return (
          <h3 key={key} id={id} className="group scroll-mt-32 pt-2">
            <span className="flex items-start gap-2 text-2xl font-black uppercase leading-tight tracking-tight text-foreground sm:text-3xl">
              <span>
                {node.children.map((child, index) => renderInline(child, `${key}-${index}`))}
              </span>
              <a
                href={`#${id}`}
                aria-label={`Link to section: ${text}`}
                className="mt-1 text-base text-border-strong opacity-0 transition group-hover:opacity-100 hover:text-accent"
              >
                #
              </a>
            </span>
          </h3>
        );
      }

      const HeadingTag = node.depth <= 1 ? "h2" : "h4";
      const className =
        node.depth <= 1
          ? "pt-8 text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl"
          : "pt-4 text-xl font-bold text-foreground";

      return (
        <HeadingTag key={key} id={id} className={`scroll-mt-32 ${className}`}>
          {node.children.map((child, index) => renderInline(child, `${key}-${index}`))}
        </HeadingTag>
      );
    }
    case "paragraph": {
      const isLede = ctx.paragraphIndex === 0;
      ctx.paragraphIndex += 1;

      if (isLede) {
        return (
          <p
            key={key}
            className={
              ctx.dropCap
                ? "text-xl font-medium leading-[1.7] text-foreground/90 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-heading first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8] first-letter:text-accent sm:text-2xl sm:first-letter:text-7xl"
                : "text-xl font-medium leading-[1.7] text-foreground/90 sm:text-2xl"
            }
          >
            {node.children.map((child, index) => renderInline(child, `${key}-${index}`))}
          </p>
        );
      }

      return (
        <p key={key} className="text-[1.075rem] leading-[1.85] text-foreground/75 sm:text-lg">
          {node.children.map((child, index) => renderInline(child, `${key}-${index}`))}
        </p>
      );
    }
    case "list": {
      const listNode = node as List;
      const Tag = listNode.ordered ? "ol" : "ul";
      const markerClass = listNode.ordered ? "list-decimal" : "list-disc";

      return (
        <Tag key={key} className={`grid gap-4 pl-6 text-[1.075rem] leading-[1.85] text-foreground/75 marker:text-accent ${markerClass}`}>
          {listNode.children.map((child, index) => renderListItem(child, `${key}-${index}`, ctx))}
        </Tag>
      );
    }
    case "blockquote":
      return (
        <blockquote key={key} className="relative overflow-hidden rounded-3xl border-l-4 border-accent bg-gradient-to-br from-accent-soft via-white to-white px-5 py-6 shadow-premium sm:px-8 sm:py-8">
          <div className="absolute top-4 left-4 text-4xl text-accent/20 font-serif">“</div>
          <div className="grid gap-6 text-lg font-medium italic leading-relaxed text-foreground/85 sm:text-xl">
            {node.children.map((child, index) => renderBlock(child, `${key}-${index}`, ctx))}
          </div>
        </blockquote>
      );
    case "code":
      return (
        <div key={key} className="overflow-hidden rounded-3xl border border-border bg-black/[0.02] shadow-premium">
          {node.lang ? (
            <div className="border-b border-border bg-black/[0.02] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
              {node.lang}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-6 text-sm font-mono leading-relaxed text-foreground/90">
            <code>{node.value}</code>
          </pre>
        </div>
      );
    case "thematicBreak":
      return (
        <div key={key} aria-hidden="true" className="flex items-center gap-3 py-2">
          <span className="h-px flex-1 bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="h-px flex-1 bg-border" />
        </div>
      );
    case "table": {
      const tableNode = node as Table;
      const [headerRow, ...bodyRows] = tableNode.children;

      return (
        <div key={key} className="my-8 overflow-x-auto rounded-3xl border border-border bg-black/[0.01] shadow-premium">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-black/[0.02]">
                {headerRow.children.map((cell, index) =>
                  renderTableCell(cell, `${key}-head-${index}`, tableNode.align?.[index], true),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bodyRows.map((row, rowIndex) => (
                <tr key={`${key}-row-${rowIndex}`} className="transition-colors hover:bg-black/[0.02]">
                  {row.children.map((cell, cellIndex) =>
                    renderTableCell(
                      cell,
                      `${key}-cell-${rowIndex}-${cellIndex}`,
                      tableNode.align?.[cellIndex],
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "image":
      return (
        <figure key={key} className="my-10 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
            <img
              alt={node.alt ?? ""}
              className="w-full transition-transform duration-700 hover:scale-[1.02]"
              src={withBasePath(node.url)}
              loading="lazy"
            />
          </div>
          {node.title ? (
            <figcaption className="px-4 text-center text-sm font-medium italic text-muted">
              — {node.title}
            </figcaption>
          ) : null}
        </figure>
      );
    default:
      return null;
  }
}

function parseMarkdown(content: string) {
  return remark().use(remarkGfm).parse(content) as Root;
}

export function ArticleBody({ content, dropCap = true }: ArticleBodyProps) {
  const tree = parseMarkdown(content);
  const ctx: RenderContext = {
    headingCursor: 0,
    headingIds: extractHeadings(content).map((heading) => heading.id),
    paragraphIndex: 0,
    dropCap,
  };

  return (
    <article className="story-surface !p-5 sm:!p-12 lg:!p-14">
      <div className="mx-auto flex w-full max-w-[720px] min-w-0 flex-col gap-7 sm:gap-8">
        {tree.children.map((node, index) => renderBlock(node, `node-${index}`, ctx))}
      </div>
    </article>
  );
}
