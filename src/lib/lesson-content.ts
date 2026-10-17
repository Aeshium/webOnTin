import type { JSONContent } from "@tiptap/core";

const LEGACY_DOC_PREFIX = "otdoc:";

function safeUrl(value: unknown, allowMailto = false) {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:" || (allowMailto && parsed.protocol === "mailto:")) {
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeNode(value: unknown): JSONContent | null {
  if (!value || typeof value !== "object" || !("type" in value) || typeof value.type !== "string") return null;
  const node = value as Record<string, unknown>;
  if (typeof node.type !== "string") return null;
  const type = node.type;
  const allowed = new Set([
    "doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem",
    "blockquote", "codeBlock", "horizontalRule", "hardBreak", "image", "table",
    "tableRow", "tableHeader", "tableCell", "lessonQuestion", "lessonCallout",
  ]);
  if (!allowed.has(type)) return null;
  if (type === "text") {
    const text = node.text;
    if (typeof text !== "string") return null;
    const marks = Array.isArray(node.marks) ? node.marks.flatMap((mark) => {
      if (!mark || typeof mark !== "object" || !("type" in mark) || typeof mark.type !== "string") return [];
      if (["bold", "italic", "strike", "code"].includes(mark.type)) return [{ type: mark.type }];
      if (mark.type === "link" && "attrs" in mark && mark.attrs && typeof mark.attrs === "object" && "href" in mark.attrs) {
        const attrs = mark.attrs as Record<string, unknown>;
        const href = safeUrl(attrs.href, true);
        return href ? [{ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } }] : [];
      }
      return [];
    }) : undefined;
    return { type, text, ...(marks?.length ? { marks } : {}) };
  }

  const attrs: Record<string, string | number | boolean> = {};
  const nodeAttrs = node.attrs && typeof node.attrs === "object"
    ? node.attrs as Record<string, unknown>
    : {};
  if (type === "heading" && "level" in nodeAttrs) {
    const level = nodeAttrs.level;
    if (level === 1 || level === 2 || level === 3) attrs.level = level;
  }
  if (type === "heading" && typeof nodeAttrs.id === "string" && /^lesson-heading-\d+$/.test(nodeAttrs.id)) {
    attrs.id = nodeAttrs.id;
  }
  if (type === "orderedList" && "start" in nodeAttrs) {
    const start = nodeAttrs.start;
    if (typeof start === "number" && Number.isInteger(start) && start > 0) attrs.start = start;
  }
  if (type === "lessonQuestion") {
    const questionId = nodeAttrs.questionId;
    if (typeof questionId !== "number" || !Number.isInteger(questionId) || questionId <= 0) return null;
    attrs.questionId = questionId;
  }
  if (type === "image") {
    const source = safeUrl(nodeAttrs.src);
    if (!source) return null;
    attrs.src = source;
    if (typeof nodeAttrs.alt === "string") attrs.alt = nodeAttrs.alt.slice(0, 500);
    if (typeof nodeAttrs.title === "string") attrs.title = nodeAttrs.title.slice(0, 500);
  }
  const content = Array.isArray(node.content)
    ? node.content.flatMap((child) => {
        const safeChild = sanitizeNode(child);
        return safeChild ? [safeChild] : [];
      })
    : undefined;
  return {
    type,
    ...(Object.keys(attrs).length ? { attrs } : {}),
    ...(content?.length ? { content } : {}),
  };
}

function assignHeadingIds(document: JSONContent): JSONContent {
  const existingIds = new Set<string>();
  function collectExisting(node: JSONContent) {
    const id = node.attrs?.id;
    if (node.type === "heading" && typeof id === "string") existingIds.add(id);
    node.content?.forEach(collectExisting);
  }
  collectExisting(document);

  const assignedIds = new Set<string>();
  let nextId = 1;
  function visit(node: JSONContent): JSONContent {
    const content = node.content?.map(visit);
    if (node.type !== "heading") return { ...node, ...(content ? { content } : {}) };

    const currentId = node.attrs?.id;
    let id = typeof currentId === "string" && !assignedIds.has(currentId) ? currentId : "";
    while (!id) {
      const candidate = `lesson-heading-${nextId++}`;
      if (!existingIds.has(candidate) && !assignedIds.has(candidate)) id = candidate;
    }
    assignedIds.add(id);
    return {
      ...node,
      attrs: { ...node.attrs, id },
      ...(content ? { content } : {}),
    };
  }
  return visit(document);
}

export function parseLessonContent(value: string): JSONContent {
  const stored = value.startsWith(LEGACY_DOC_PREFIX) ? value.slice(LEGACY_DOC_PREFIX.length) : value;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed === "object" &&
      "type" in parsed &&
      parsed.type === "doc"
    ) {
      const safeDocument = sanitizeNode(parsed);
      if (safeDocument?.type === "doc") return assignHeadingIds(safeDocument);
    }
  } catch {
    // Existing lessons store plain text; display them as paragraphs in the editor.
  }
  return assignHeadingIds({
    type: "doc",
    content: stored.split(/\r?\n/).map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  });
}

export function serializeLessonContent(document: JSONContent) {
  return `${LEGACY_DOC_PREFIX}${JSON.stringify(document)}`;
}

export type LessonContentBlock =
  | { type: "content"; content: string }
  | { type: "question"; questionId: number };

export function getLessonContentBlocks(value: string): LessonContentBlock[] {
  const document = parseLessonContent(value);
  const blocks: LessonContentBlock[] = [];
  let content: JSONContent[] = [];
  const flushContent = () => {
    if (content.length === 0) return;
    blocks.push({ type: "content", content: serializeLessonContent({ type: "doc", content }) });
    content = [];
  };

  for (const node of document.content ?? []) {
    if (node.type === "lessonQuestion") {
      const questionId = node.attrs?.questionId;
      flushContent();
      if (typeof questionId === "number") blocks.push({ type: "question", questionId });
    } else {
      content.push(node);
    }
  }
  flushContent();
  return blocks;
}

export function getLessonQuestionIds(value: string) {
  const ids: number[] = [];
  function visit(node: JSONContent) {
    if (node.type === "lessonQuestion" && typeof node.attrs?.questionId === "number") {
      ids.push(node.attrs.questionId);
    }
    node.content?.forEach(visit);
  }
  visit(parseLessonContent(value));
  return ids;
}

export type LessonHeading = { id: string; level: number; title: string };

export function getLessonHeadings(value: string): LessonHeading[] {
  const headings: LessonHeading[] = [];
  function textContent(node: JSONContent): string {
    if (node.type === "text") return node.text ?? "";
    return (node.content ?? []).map(textContent).join("");
  }
  function visit(node: JSONContent) {
    if (node.type === "heading" && typeof node.attrs?.id === "string") {
      headings.push({
        id: node.attrs.id,
        level: typeof node.attrs.level === "number" ? node.attrs.level : 1,
        title: textContent(node).trim(),
      });
    }
    node.content?.forEach(visit);
  }
  visit(parseLessonContent(value));
  return headings.filter((heading) => heading.title.length > 0);
}

export function hasNestedLessonQuestionBlocks(value: string) {
  function containsQuestion(node: JSONContent): boolean {
    if (node.type === "lessonQuestion") return true;
    return node.content?.some(containsQuestion) ?? false;
  }
  const document = parseLessonContent(value);
  return (document.content ?? []).some((node) =>
    node.type !== "lessonQuestion" && containsQuestion(node)
  );
}

export function getLessonContentPreview(value: string) {
  const document = parseLessonContent(value);
  const text: string[] = [];
  function visit(node: JSONContent) {
    if (node.type === "text" && typeof node.text === "string") text.push(node.text);
    if (node.type === "image") text.push("[Ảnh]");
    node.content?.forEach(visit);
  }
  visit(document);
  return text.join(" ").replace(/\s+/g, " ").trim();
}
