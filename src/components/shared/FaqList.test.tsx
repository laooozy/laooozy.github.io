import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FaqList from "./FaqList";

describe("FaqList", () => {
  it("renders every question and answer as collapsed native details", () => {
    const html = renderToStaticMarkup(
      <FaqList
        items={[
          { question: "First question?", answer: "First answer." },
          { question: "Second question?", answer: "Second answer." },
        ]}
      />,
    );

    expect(html.match(/<details/g)).toHaveLength(2);
    expect(html).not.toContain("<details open");
    expect(html).toContain("First question?");
    expect(html).toContain("First answer.");
    expect(html).toContain("Second question?");
    expect(html).toContain("Second answer.");
    expect(html).toContain("data-faq-list");
    expect(html).toContain("data-faq-answer");
    expect(html).toContain('aria-hidden="true"');
  });
});
