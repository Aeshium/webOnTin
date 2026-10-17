import { Node } from "@tiptap/core";

export const LessonQuestionExtension = Node.create({
  name: "lessonQuestion",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      questionId: {
        default: null,
        parseHTML: (element) => Number(element.getAttribute("data-question-id")),
        renderHTML: (attributes) => ({ "data-question-id": attributes.questionId }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-lesson-question]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-lesson-question": "" }, "Câu hỏi đính kèm"];
  },

  addNodeView() {
    return ({ node }) => {
      const element = document.createElement("div");
      element.className = "lesson-question-marker";
      element.contentEditable = "false";
      element.textContent = `Câu hỏi #${node.attrs.questionId} · hiển thị tại vị trí này`;
      return { dom: element };
    };
  },
});
