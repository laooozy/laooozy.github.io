/**
 * Reject arbitrary brand colour literals such as `bg-[#ff0000]`.
 *
 * Brand colours must come from the design tokens (`src/styles/tokens.css` and
 * the shadcn variable bridge in `src/styles/global.css`), never from a
 * hard-coded hex value in a Tailwind arbitrary value. The rule checks string
 * literals and template literals, including JSX `className` attributes.
 */
const ARBITRARY_COLOUR =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-\[#[0-9a-fA-F]{3,8}(?:\/[^\]]*)?\]/;

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow arbitrary brand colour literals in class names",
    },
    schema: [],
    messages: {
      arbitraryColour:
        'Arbitrary brand colour "{{match}}" is not allowed; use a design token class instead.',
    },
  },
  create(context) {
    function check(node, value) {
      if (typeof value !== "string") return;
      const match = ARBITRARY_COLOUR.exec(value);
      if (match === null) return;
      context.report({
        node,
        messageId: "arbitraryColour",
        data: { match: match[0] },
      });
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};

export default rule;
