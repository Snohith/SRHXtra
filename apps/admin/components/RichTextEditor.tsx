"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

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

  // Sync an external value (e.g. restoring an old revision) into the editor.
  // Local typing already has value === getHTML(); a focused editor is left
  // alone so this cannot fight the caret while someone is typing.
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor)
    return (
      <div className="editor-shell">
        <div className="sk sk-line" style={{ margin: 16, height: 16 }} />
        <div
          className="sk sk-line"
          style={{ margin: 16, height: 16, width: "60%" }}
        />
      </div>
    );

  const btn = (
    label: string,
    icon: React.ReactNode,
    active: boolean,
    run: () => void,
  ) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={active ? "on" : ""}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {icon}
    </button>
  );

  return (
    <div className="editor-shell">
      <div className="editorbar">
        {btn(
          "Heading 2",
          <Heading2 size={16} />,
          editor.isActive("heading", { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {btn(
          "Heading 3",
          <Heading3 size={16} />,
          editor.isActive("heading", { level: 3 }),
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        )}
        <span className="sep" />
        {btn("Bold", <Bold size={15} />, editor.isActive("bold"), () =>
          editor.chain().focus().toggleBold().run(),
        )}
        {btn("Italic", <Italic size={15} />, editor.isActive("italic"), () =>
          editor.chain().focus().toggleItalic().run(),
        )}
        <span className="sep" />
        {btn("Quote", <Quote size={15} />, editor.isActive("blockquote"), () =>
          editor.chain().focus().toggleBlockquote().run(),
        )}
        {btn(
          "Bullet list",
          <List size={16} />,
          editor.isActive("bulletList"),
          () => editor.chain().focus().toggleBulletList().run(),
        )}
        {btn(
          "Numbered list",
          <ListOrdered size={16} />,
          editor.isActive("orderedList"),
          () => editor.chain().focus().toggleOrderedList().run(),
        )}
        <span className="sep" />
        {btn("Undo", <Undo2 size={15} />, false, () =>
          editor.chain().focus().undo().run(),
        )}
        {btn("Redo", <Redo2 size={15} />, false, () =>
          editor.chain().focus().redo().run(),
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
