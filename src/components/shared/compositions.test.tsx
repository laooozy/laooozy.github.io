import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ContactRow from "./ContactRow";
import Cta from "./Cta";
import HeroMeta from "./HeroMeta";
import HeroView from "./HeroView";
import InterestCard from "./InterestCard";
import PhotographyMasthead from "./PhotographyMasthead";
import Section from "./Section";

function h1Count(html: string): number {
  return html.match(/<h1\b/g)?.length ?? 0;
}

describe("page compositions", () => {
  describe("Section", () => {
    it("renders an h2 heading wired to the section with aria-labelledby", () => {
      const html = renderToStaticMarkup(
        <Section id="about" heading="About" lead="A short intro.">
          <p>Body copy.</p>
        </Section>,
      );

      expect(html).toContain(
        '<section id="about" aria-labelledby="about-heading"',
      );
      expect(html).toContain("<h2 ");
      expect(html).toContain('id="about-heading"');
      expect(html).toContain("About");
      expect(html).toContain("A short intro.");
      expect(html).toContain("Body copy.");
    });

    it("renders an actions control beside the heading", () => {
      const html = renderToStaticMarkup(
        <Section
          id="blog"
          heading="Latest posts"
          actions={<a href="/blog/">See all</a>}
        >
          <p>Posts.</p>
        </Section>,
      );

      expect(html).toContain('href="/blog/"');
      expect(html).toContain("See all");
      expect(html).toContain("section__actions");
    });

    it("renders nothing for hidden=true", () => {
      const html = renderToStaticMarkup(
        <Section id="approach" heading="Approach" hidden>
          <p>Body.</p>
        </Section>,
      );

      expect(html).toBe("");
    });

    it("renders nothing for hidden=empty with no visible children", () => {
      const html = renderToStaticMarkup(
        <Section id="approach" heading="Approach" hidden="empty" />,
      );
      const whitespace = renderToStaticMarkup(
        <Section id="approach" heading="Approach" hidden="empty">
          {" \n "}
        </Section>,
      );

      expect(html).toBe("");
      expect(whitespace).toBe("");
    });

    it("renders again once hidden=empty gains real children", () => {
      const html = renderToStaticMarkup(
        <Section id="approach" heading="Approach" hidden="empty">
          <p>Real copy.</p>
        </Section>,
      );

      expect(html).toContain("Real copy.");
      expect(html).toContain('<section id="approach"');
    });
  });

  describe("identity headings", () => {
    it("renders one h1 for the home hero fixture", () => {
      const html = renderToStaticMarkup(
        <>
          <HeroView title="laooozy" lead="Home lead." />
          <Section id="about" heading="About">
            <InterestCard id="runner" title="Running">
              <p>Body.</p>
            </InterestCard>
          </Section>
        </>,
      );

      expect(h1Count(html)).toBe(1);
      expect(html).toContain("hero__title");
      expect(html).toContain("hero__period");
      expect(html).toContain("Home lead.");
    });

    it("renders one h1 for the photography masthead fixture", () => {
      const html = renderToStaticMarkup(
        <>
          <PhotographyMasthead title="攝影師（？）" lead="業餘新手">
            <p>Intro body.</p>
          </PhotographyMasthead>
          <Section id="work" heading="Works">
            <p>Wall.</p>
          </Section>
        </>,
      );

      expect(h1Count(html)).toBe(1);
      expect(html).toContain("photo-masthead__title");
      expect(html).toContain("業餘新手");
    });

    it("uses title for identity and heading/lead for sections", () => {
      const card = renderToStaticMarkup(
        <InterestCard title="Music">
          <p>Body.</p>
        </InterestCard>,
      );
      const masthead = renderToStaticMarkup(
        <PhotographyMasthead title="Photography" lead="Lead." />,
      );

      expect(card).toContain("<h3");
      expect(card).toContain("Music");
      expect(masthead).toContain("Lead.");
      expect(masthead).toContain("photo-masthead__intro");
    });
  });

  describe("InterestCard", () => {
    it("renders the card modifier and body stack", () => {
      const html = renderToStaticMarkup(
        <InterestCard id="photography" title="Photography">
          <p>Body.</p>
        </InterestCard>,
      );

      expect(html).toContain("interest--photography");
      expect(html).toContain("interest__label");
      expect(html).toContain("stack flex flex-col");
      expect(html).toContain("Body.");
    });

    it("renders nothing for hidden=empty without children", () => {
      expect(
        renderToStaticMarkup(
          <InterestCard id="music" title="Music" hidden="empty" />,
        ),
      ).toBe("");
    });
  });

  describe("Cta", () => {
    it("renders the quiet link variant with the arrow", () => {
      const html = renderToStaticMarkup(
        <Cta href="/photographer/" label="Photography" />,
      );

      expect(html).toContain('href="/photographer/"');
      expect(html).toContain("Photography");
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain('target="_blank"');
    });

    it("renders the photo variant as an external target", () => {
      const html = renderToStaticMarkup(
        <Cta
          href="https://instagram.com/x"
          label="Instagram"
          variant="photo"
          external
        />,
      );

      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener"');
      expect(html).toContain("var(--accent)");
    });
  });

  describe("ContactRow", () => {
    it("renders an li row with a labelled link", () => {
      const html = renderToStaticMarkup(
        <ul>
          <ContactRow
            label="Instagram（個人）"
            ariaLabel="Instagram 個人帳號"
            href="https://instagram.com/laooozy"
            value="@laooozy"
          />
        </ul>,
      );

      expect(html).toContain("<li");
      expect(html).toContain("Instagram（個人）");
      expect(html).toContain('aria-label="Instagram 個人帳號"');
      expect(html).toContain("@laooozy");
    });
  });

  describe("HeroMeta", () => {
    it("renders linked and plain spec rows", () => {
      const html = renderToStaticMarkup(
        <HeroMeta
          meta={[
            { label: "所在地", value: "HK" },
            {
              label: "Instagram",
              value: "@x",
              href: "https://instagram.com/x",
            },
          ]}
        />,
      );

      expect(html).toContain("hero__meta-row");
      expect(html).toContain("所在地");
      expect(html).toContain('href="https://instagram.com/x"');
    });

    it("renders nothing without rows", () => {
      expect(renderToStaticMarkup(<HeroMeta meta={[]} />)).toBe("");
    });
  });
});
