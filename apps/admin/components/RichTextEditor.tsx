"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

/** Tiptap body editor (StarterKit: headings, lists, quotes, bold/italic…). */
export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync once when the editor mounts with an existing article body.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [editor]);

  if (!editor) return <div className="tiptap muted">Loading editor…</div>;

  const btn = (label: string, active: boolean, run: () => void) => (
    <button
      key={label}
      type="button"
      className={active ? "on" : ""}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="editorbar">
        {btn("H2", editor.isActive("heading", { level: 2 }), () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {btn("H3", editor.isActive("heading", { level: 3 }), () =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        )}
        {btn("B", editor.isActive("bold"), () =>
          editor.chain().focus().toggleBold().run(),
        )}
        {btn("I", editor.isActive("italic"), () =>
          editor.chain().focus().toggleItalic().run(),
        )}
        {btn("Quote", editor.isActive("blockquote"), () =>
          editor.chain().focus().toggleBlockquote().run(),
        )}
        {btn("• List", editor.isActive("bulletList"), () =>
          editor.chain().focus().toggleBulletList().run(),
        )}
        {btn("1. List", editor.isActive("orderedList"), () =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
        {btn("Undo", false, () => editor.chain().focus().undo().run())}
        {btn("Redo", false, () => editor.chain().focus().redo().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
