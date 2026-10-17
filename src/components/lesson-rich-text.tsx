"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { parseLessonContent, serializeLessonContent } from "@/lib/lesson-content";
import { LessonCalloutExtension, LessonHeadingExtension } from "@/lib/lesson-content-extensions";
import { LessonQuestionExtension } from "@/lib/lesson-question-extension";

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    link: false,
    heading: false,
  }),
  LessonHeadingExtension,
  LessonCalloutExtension,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
  Image.configure({ allowBase64: false }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  LessonQuestionExtension,
];

type AvailableQuestion = { id: number; content: string };

function safeUrl(value: string, allowImagePath: boolean) {
  const url = value.trim();
  if (allowImagePath && url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" || (!allowImagePath && parsed.protocol === "mailto:")
      ? url
      : null;
  } catch {
    return null;
  }
}

export function LessonRichTextEditor({
  content,
  onChange,
  availableQuestions = [],
}: {
  content: string;
  onChange: (content: string) => void;
  availableQuestions?: AvailableQuestion[];
}) {
  const [linkInput, setLinkInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [toolbarError, setToolbarError] = useState("");
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: parseLessonContent(content),
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange(serializeLessonContent(currentEditor.getJSON())),
    editorProps: {
      attributes: {
        class: "lesson-rich-content min-h-72 px-4 py-3 text-sm leading-7 text-slate-200 outline-none",
      },
    },
  });

  if (!editor) return <div className="min-h-72 animate-pulse rounded-xl bg-white/5" aria-label="Đang tải trình soạn thảo" />;

  const run = (callback: () => void) => {
    setToolbarError("");
    callback();
  };
  const applyLink = () => {
    const href = safeUrl(linkInput, false);
    if (!href) {
      setToolbarError("Liên kết chỉ hỗ trợ http, https hoặc mailto.");
      return;
    }
    run(() => editor.chain().focus().extendMarkRange("link").setLink({ href }).run());
    setLinkInput("");
  };
  const addImage = () => {
    const src = safeUrl(imageInput, true);
    if (!src) {
      setToolbarError("Ảnh cần URL http/https hoặc đường dẫn nội bộ bắt đầu bằng /.");
      return;
    }
    run(() => editor.chain().focus().setImage({ src, alt: "Ảnh minh họa bài học" }).run());
    setImageInput("");
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-950">
      <div className="flex flex-wrap gap-1 border-b border-white/10 bg-white/[0.035] p-2">
        <select aria-label="Kiểu tiêu đề" defaultValue="" onChange={(event) => {
          const level = Number(event.target.value);
          if (level) run(() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run());
          event.target.value = "";
        }} className="h-8 rounded-md border border-white/10 bg-ink-950 px-2 text-xs text-slate-200">
          <option value="">Đoạn văn</option>
          <option value="1">Tiêu đề 1</option>
          <option value="2">Tiêu đề 2</option>
          <option value="3">Tiêu đề 3</option>
        </select>
        {[
          ["Đậm", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold")],
          ["Nghiêng", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic")],
          ["Danh sách", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList")],
          ["Danh sách số", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList")],
          ["Trích dẫn", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote")],
          ["Khối code", () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock")],
        ].map(([label, action, active]) => (
          <button
            key={label as string}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(action as () => void)}
            aria-pressed={Boolean(active)}
            className={`h-8 rounded-md px-2 text-xs font-bold ${active ? "bg-cyan-300/15 text-cyan-100" : "text-slate-300 hover:bg-white/10"}`}
          >
            {label as string}
          </button>
        ))}
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())} className="h-8 rounded-md px-2 text-xs font-bold text-slate-300 hover:bg-white/10">Bảng</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run(() => editor.chain().focus().wrapIn("lessonCallout").run())} className="h-8 rounded-md px-2 text-xs font-bold text-amber-100 hover:bg-amber-300/10">Ghi nhớ</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <form onSubmit={(event) => { event.preventDefault(); applyLink(); }} className="flex min-w-56 flex-1 gap-1">
          <input value={linkInput} onChange={(event) => setLinkInput(event.target.value)} aria-label="Địa chỉ liên kết" placeholder="https://... · Chọn chữ rồi gắn liên kết" className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white" />
          <button type="submit" className="rounded-md border border-white/10 px-2 text-xs text-slate-200">Gắn link</button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); addImage(); }} className="flex min-w-56 flex-1 gap-1">
          <input value={imageInput} onChange={(event) => setImageInput(event.target.value)} aria-label="Địa chỉ ảnh minh họa" placeholder="URL ảnh https://... hoặc /..." className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white" />
          <button type="submit" className="rounded-md border border-white/10 px-2 text-xs text-slate-200">Chèn ảnh</button>
        </form>
      </div>
      {availableQuestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
          <label className="min-w-56 flex-1 text-xs text-slate-400">
            Chèn câu hỏi tại vị trí con trỏ
            <select value={questionId} onChange={(event) => setQuestionId(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-white/10 bg-ink-950 px-2 text-xs text-slate-200">
              <option value="">Chọn câu hỏi đã đính kèm</option>
              {availableQuestions.map((question) => (
                <option key={question.id} value={question.id}>#{question.id} · {question.content.slice(0, 100)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!questionId}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const selectedId = Number(questionId);
              if (!availableQuestions.some((question) => question.id === selectedId)) {
                setToolbarError("Hãy chọn câu hỏi đã được đính kèm vào bài học.");
                return;
              }
              run(() => {
                editor.chain().focus().command(({ tr, state }) => {
                  const { $from } = state.selection;
                  const position = $from.depth > 0 ? $from.after(1) : $from.pos;
                  tr.insert(position, state.schema.nodes.lessonQuestion.create({ questionId: selectedId }));
                  return true;
                }).run();
              });
            }}
            className="mt-4 h-9 rounded-md border border-cyan-300/20 px-3 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-40"
          >
            Chèn vào bài
          </button>
        </div>
      )}
      {toolbarError && <p role="alert" className="px-3 pt-2 text-xs text-rose-200">{toolbarError}</p>}
      <EditorContent editor={editor} />
      <p className="border-t border-white/10 px-3 py-2 text-[11px] text-slate-500">Nội dung cũ dạng văn bản sẽ được mở thành đoạn văn; định dạng được lưu tương thích ở dạng tài liệu có cấu trúc.</p>
    </div>
  );
}

export function LessonRichTextContent({ content }: { content: string }) {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: parseLessonContent(content) as JSONContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "lesson-rich-content text-sm leading-7 text-slate-300",
      },
    },
  });
  if (!editor) return <div className="min-h-12 animate-pulse rounded-lg bg-white/5" />;
  return <EditorContent editor={editor} />;
}
