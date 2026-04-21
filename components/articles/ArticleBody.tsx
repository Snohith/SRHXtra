import { withBasePath } from "@/lib/utils/paths";
import type { Content, InlineCode, Link, List, ListItem, Paragraph, PhrasingContent, Root, Table, TableCell } from "mdast";
import type { ReactNode } from "react";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

interface ArticleBodyProps {
  content: string;
}

function renderInline(node: PhrasingContent, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return node.value;
    case "emphasis":
      return <em key={key}>{node.children.map((child, index) => renderInline(child, `${key}-${index}`))}</em>;
    case "strong":
      return <strong key={key} className="font-semibold text-white">{node.children.map((child, index) => renderInline(child, `${key}-${index}`))}</strong>;
    case "delete":
      return <del key={key}>{node.children.map((child, index) => renderInline(child, `${key}-${index}`))}</del>;
    case "inlineCode":
      return (
        <code
          key={key}
          className="rounded-md border border-border bg-white/5 px-1.5 py-0.5 font-mono text-[0.92em] text-orange-200"
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
          className="font-medium text-orange-200 underline decoration-orange-500/40 underline-offset-4 transition hover:text-orange-100"
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
      className={`border border-border px-4 py-3 align-top text-sm leading-7 ${alignment} ${isHeader ? "bg-white/5 font-semibold text-white" : "text-slate-300"}`}
    >
      {cell.children.map((child, index) => renderInline(child as Paragraph["children"][number], `${key}-${index}`))}
    </Tag>
  );
}

function renderListItem(item: ListItem, key: string) {
  return (
    <li key={key} className="pl-1">
      <div className="grid gap-3">
        {item.children.map((child, index) => renderBlock(child, `${key}-${index}`))}
      </div>
    </li>
  );
}

function renderBlock(node: Content, key: string): ReactNode {
  switch (node.type) {
    case "heading": {
      const HeadingTag = node.depth <= 1 ? "h2" : node.depth === 2 ? "h3" : "h4";
      const className =
        node.depth <= 1
          ? "pt-8 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl"
          : node.depth === 2
            ? "pt-6 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl"
            : "pt-4 text-xl font-bold text-white";

      return (
        <HeadingTag key={key} className={className}>
          {node.children.map((child, index) => renderInline(child, `${key}-${index}`))}
        </HeadingTag>
      );
    }
    case "paragraph":
      return (
        <p key={key} className="text-lg leading-[1.8] text-muted sm:text-xl">
          {node.children.map((child, index) => renderInline(child, `${key}-${index}`))}
        </p>
      );
    case "list": {
      const listNode = node as List;
      const Tag = listNode.ordered ? "ol" : "ul";
      const markerClass = listNode.ordered ? "list-decimal" : "list-disc";

      return (
        <Tag key={key} className={`grid gap-4 pl-6 text-lg leading-[1.8] text-muted marker:text-accent ${markerClass}`}>
          {listNode.children.map((child, index) => renderListItem(child, `${key}-${index}`))}
        </Tag>
      );
    }
    case "blockquote":
      return (
        <blockquote key={key} className="relative rounded-3xl border-l-4 border-accent bg-white/[0.03] px-8 py-8 shadow-premium transition-transform hover:scale-[1.01]">
          <div className="absolute top-4 left-4 text-4xl text-accent/20 font-serif">“</div>
          <div className="grid gap-6 text-xl italic font-medium leading-relaxed text-slate-200">
            {node.children.map((child, index) => renderBlock(child, `${key}-${index}`))}
          </div>
        </blockquote>
      );
    case "code":
      return (
        <div key={key} className="overflow-hidden rounded-3xl border border-white/5 bg-black/40 shadow-premium">
          {node.lang ? (
            <div className="border-b border-white/5 bg-white/5 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
              {node.lang}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-6 text-sm font-mono leading-relaxed text-orange-100">
            <code>{node.value}</code>
          </pre>
        </div>
      );
    case "thematicBreak":
      return <hr key={key} className="my-8 border-white/5" />;
    case "table": {
      const tableNode = node as Table;
      const [headerRow, ...bodyRows] = tableNode.children;

      return (
        <div key={key} className="my-8 overflow-x-auto rounded-3xl border border-white/5 bg-white/[0.02] shadow-premium">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                {headerRow.children.map((cell, index) =>
                  renderTableCell(cell, `${key}-head-${index}`, tableNode.align?.[index], true),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bodyRows.map((row, rowIndex) => (
                <tr key={`${key}-row-${rowIndex}`} className="transition-colors hover:bg-white/[0.02]">
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
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-surface/40 shadow-premium">
            <img 
              alt={node.alt ?? ""} 
              className="w-full transition-transform duration-700 hover:scale-[1.02]" 
              src={withBasePath(node.url)} 
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

export function ArticleBody({ content }: ArticleBodyProps) {
  const tree = parseMarkdown(content);

  return (
    <article className="story-surface !p-8 sm:!p-12 lg:!p-16">
      <div className="mx-auto flex max-w-[720px] flex-col gap-8">
        {tree.children.map((node, index) => renderBlock(node, `node-${index}`))}
      </div>
    </article>
  );
}
