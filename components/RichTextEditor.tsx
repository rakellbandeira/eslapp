"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useState } from "react";

const TEXT_COLORS = [
  { label: "Wine red", value: "#7f1d1d" },
  { label: "Dark green", value: "#14532d" },
  { label: "Navy blue", value: "#1e3a8a" },
  { label: "Mustard orange", value: "#b45309" },
];

const HIGHLIGHT_COLORS = [
  { label: "Light red", value: "#fecaca" },
  { label: "Light green", value: "#bbf7d0" },
  { label: "Light blue", value: "#bfdbfe" },
  { label: "Light yellow", value: "#fef08a" },
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  function insertTable() {
    editor
      .chain()
      .focus()
      .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: false })
      .run();
    setShowTableMenu(false);
  }

  function setCellBackground(color: string) {
    editor.chain().focus().setCellAttribute("backgroundColor", color).run();
  }

  const btnClass = (active: boolean) =>
    `rounded px-2 py-1 text-xs font-medium ${
      active ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="rounded-md border border-gray-300">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))}>
          B
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))}>
          I
        </button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive("underline"))}>
          U
        </button>

        <select
          onChange={(e) => {
            const val = e.target.value;
            if (val === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(val) as 1 | 2 | 3 }).run();
          }}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
          defaultValue="p"
        >
          <option value="p">Paragraph</option>
          <option value="1">Title (H1)</option>
          <option value="2">Heading (H2)</option>
          <option value="3">Subheading (H3)</option>
        </select>

        <div className="h-5 w-px bg-gray-300" />

        {/* Text color */}
        <span className="text-xs text-gray-500">Text:</span>
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.label}
            onClick={() => editor.chain().focus().setColor(c.value).run()}
            className="h-5 w-5 rounded-full border border-gray-300"
            style={{ backgroundColor: c.value }}
          />
        ))}

        <div className="h-5 w-px bg-gray-300" />

        {/* Highlight color */}
        <span className="text-xs text-gray-500">Highlight:</span>
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.label}
            onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
            className="h-5 w-5 rounded-full border border-gray-300"
            style={{ backgroundColor: c.value }}
          />
        ))}

        <div className="h-5 w-px bg-gray-300" />

        {/* Alignment */}
        <button onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btnClass(editor.isActive({ textAlign: "left" }))}>
          ⬅
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btnClass(editor.isActive({ textAlign: "center" }))}>
          ↔
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btnClass(editor.isActive({ textAlign: "right" }))}>
          ➡
        </button>

        <div className="h-5 w-px bg-gray-300" />

        {/* Lists */}
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))}>
          • List
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))}>
          1. List
        </button>

        <div className="h-5 w-px bg-gray-300" />

        {/* Table */}
        <div className="relative">
          <button onClick={() => setShowTableMenu(!showTableMenu)} className={btnClass(false)}>
            Table
          </button>
          {showTableMenu && (
            <div className="absolute z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center gap-2">
                <label className="text-xs text-gray-600">Rows</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                  className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs"
                />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <label className="text-xs text-gray-600">Cols</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                  className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs"
                />
              </div>
              <button
                onClick={insertTable}
                className="w-full rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Insert
              </button>
            </div>
          )}
        </div>

        {editor.isActive("table") && (
          <>
            <span className="text-xs text-gray-500">Cell bg:</span>
            {["#fecaca", "#bbf7d0", "#bfdbfe", "#fef08a"].map((color) => (
              <button
                key={color}
                onClick={() => setCellBackground(color)}
                className="h-5 w-5 rounded-full border border-gray-300"
                style={{ backgroundColor: color }}
              />
            ))}
          </>
        )}
      </div>

      {/* Editable content area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2"
      />
    </div>
  );
}