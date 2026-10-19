/**
 * HomePage — the single-page home, shared by all three locales, as a hydrated
 * React island.
 *
 * Composed from the reusable kit only: Hero → Section#about → Section#blog →
 * Section#contact. The three sections carry the `reveal` class so the entrance
 * animation (declared only under `prefers-reduced-motion: no-preference`, in
 * global.css) enhances an already-visible default; the Hero keeps its own
 * entrance. The `#about` grid renders `aboutCards` from `@/data/about` (card
 * order + locale-independent extras) and resolves every label/note through
 * `useT`, so switching language re-renders the page copy in place — no
 * navigation, no reload. The ACG persona has no standalone home section; its
 * card in the About grid is the entry point to `/acg/`. Every user-facing
 * string comes from `useT`, bound to the store's active locale. The blog data
 * is fetched at BUILD time by `pages/index.astro` (which owns the
 * `astro:content` I/O edge) and passed in as serializable props; only the
 * localized chrome is client state.
 *
 * Hydration safety
 * ----------------
 * The build-time SSR HTML is always the DEFAULT locale, while the store may
 * already hold another locale on the first client render. Rendering the default
 * locale until `mounted` flips (mirroring `SiteHeader`/`SiteFooter`) keeps the
 * hydration render byte-identical to the server and eliminates the React
 * mismatch; the store locale is adopted immediately after mount. This is the
 * one accepted first-load frame of `zh-hant` copy for a non-default visitor.
 */

import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import Card from "@/components/Card";
import ChipRow from "@/components/ChipRow";
import Hero from "@/components/Hero";
import Grid from "@/components/layout/Grid";
import Section from "@/components/layout/Section";
import Stack from "@/components/layout/Stack";
import PostCard from "@/components/PostCard";
import Text from "@/components/ui/Text";
import { aboutCards } from "@/data/about";
import { useT, type Translate } from "@/hooks/useT";
import {
  contactIdentity,
  defaultLang,
  games,
  t as translate,
  vtubers,
} from "@/i18n";
import { blogIndexPath } from "@/lib/domain/posts";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

const ALL_POSTS_HREF = blogIndexPath().replace(/\/$/, "");

/**
 * A blog post reduced to the serializable fields the home list needs. `date` is
 * the build-local calendar day (`YYYY-MM-DD`) so the client formats the SAME
 * day in any timezone; `datetime` keeps the full ISO instant for `<time>`.
 */
export interface HomePost {
  href: string;
  title: string;
  description: string;
  date: string;
  datetime: string;
  tags: string[];
}

interface HomePageProps {
  /** Latest posts (build-time), already localized-independent fields only. */
  posts: HomePost[];
}

export default function HomePage({ posts }: HomePageProps) {
  const t = useT(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;

  const heroMeta = [
    { label: tr("home.baseLabel"), value: tr("home.baseValue") },
    {
      label: tr("contact.instagramLabel"),
      value: `@${contactIdentity.personalIg}`,
    },
  ];

  const contacts = [
    {
      key: "instagram",
      label: tr("contact.instagramLabel"),
      handle: `@${contactIdentity.personalIg}`,
      href: `https://instagram.com/${contactIdentity.personalIg}`,
    },
    {
      key: "instagram-acg",
      label: tr("contact.instagramLabel"),
      handle: `@${contactIdentity.acgIg}`,
      href: `https://instagram.com/${contactIdentity.acgIg}`,
    },
    {
      key: "email",
      label: tr("contact.emailLabel"),
      handle: contactIdentity.email,
      href: `mailto:${contactIdentity.email}`,
    },
  ];

  return (
    <div className="home">
      <Hero
        title={tr("home.title")}
        tagline={tr("home.tagline")}
        nowLabel={tr("home.nowLabel")}
        nowText={tr("home.nowText")}
        meta={heroMeta}
      />

      <Section
        id="about"
        className="reveal"
        heading={tr("about.heading")}
        lead={tr("home.intro")}
      >
        <Grid min="18rem" gap={5}>
          {aboutCards.map((card) => (
            <Card key={card.id} className={`interest interest--${card.id}`}>
              <h3 className="interest__label">{tr(card.titleKey)}</h3>

              <Stack gap={3}>
                {card.id === "runner" ? (
                  <Text as="p" tone="muted" size="sm">
                    {tr(card.noteKey)}
                  </Text>
                ) : (
                  <Text tone="muted">{tr(card.noteKey)}</Text>
                )}

                {card.id === "photography" && (
                  <>
                    <Text as="p" tone="muted" size="sm">
                      {tr(card.gearIntroKey)}
                    </Text>
                    <Stack as="ul" gap={1} className="interest__gear">
                      {card.gear.map((item) => (
                        <Text as="li" key={item.name} tone="muted" size="sm">
                          {item.name}
                          {item.noteKey ? <> {tr(item.noteKey)}</> : null}
                        </Text>
                      ))}
                    </Stack>
                  </>
                )}

                {card.id === "games" && (
                  <div className="interest__chips">
                    <ChipRow items={games.map((label) => ({ label }))} />
                  </div>
                )}

                {card.id === "vtuber" && (
                  <div className="interest__chips">
                    <ChipRow items={vtubers.map((label) => ({ label }))} />
                  </div>
                )}

                {card.id === "acg" && (
                  <div>
                    <a className="link-arrow" href={card.href}>
                      {tr("acg.cta")}
                      <span className="link-arrow__arrow" aria-hidden="true">
                        →
                      </span>
                    </a>
                  </div>
                )}
              </Stack>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section
        id="blog"
        className="reveal"
        heading={tr("blog.heading")}
        actions={
          <a className="section__more" href={ALL_POSTS_HREF}>
            {tr("button.viewAll")} <span aria-hidden="true">→</span>
          </a>
        }
      >
        {posts.length > 0 ? (
          <Grid min="18rem" gap={5}>
            {posts.map((post) => (
              <PostCard
                key={post.href}
                href={post.href}
                title={post.title}
                description={post.description}
                date={post.date}
                datetime={post.datetime}
                tags={post.tags}
              />
            ))}
          </Grid>
        ) : (
          <Text tone="muted">{tr("blog.empty")}</Text>
        )}
      </Section>

      <Section
        id="contact"
        className="reveal"
        heading={tr("contact.heading")}
        lead={tr("contact.intro")}
      >
        <Stack as="ul" gap={3}>
          {contacts.map((contact) => (
            <li key={contact.key} className="contact__item">
              <span className="contact__label">{contact.label}</span>
              <a className="contact__link" href={contact.href}>
                {contact.handle}
              </a>
            </li>
          ))}
        </Stack>
      </Section>
    </div>
  );
}
