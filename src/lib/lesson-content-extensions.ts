import { mergeAttributes, Node } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";

export const LessonHeadingExtension = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => attributes.id ? { id: attributes.id } : {},
      },
    };
  },
});

export const LessonCalloutExtension = Node.create({
  name: "lessonCallout",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-lesson-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-lesson-callout": "" }),
      ["div", { "data-callout-title": "" }, "💡 Ghi nhớ"],
      ["div", { "data-callout-content": "" }, 0],
    ];
  },

  addNodeView() {
    return () => {
      const element = document.createElement("div");
      element.className = "lesson-callout";
      const title = document.createElement("div");
      title.className = "lesson-callout-title";
      title.textContent = "💡 Ghi nhớ";
      const content = document.createElement("div");
      content.className = "lesson-callout-content";
      element.append(title, content);
      return { dom: element, contentDOM: content };
    };
  },
});
