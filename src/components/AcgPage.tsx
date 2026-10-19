/**
 * AcgPage — the ACG / coser-photography page, shared by all three locales, as a
 * hydrated React island.
 *
 * Structure: masthead (intro) → photo wall (Instagram embeds) → approach →
 * commission. The three sections carry the `reveal` class so the entrance
 * animation (declared only under `prefers-reduced-motion: no-preference`, in
 * pages.css) enhances an already-visible default; the masthead keeps its own
 * entrance. Every user-facing string comes from `useT` (store-bound locale),
 * so switching language re-renders the copy in place — no navigation, no reload.
 * The Instagram embeds are resolved at BUILD time by `pages/acg.astro` (the
 * network I/O edge) and passed in as serializable props; the page only renders
 * them.
 *
 * String arrays (`approach`, `commissionPoints`) are not addressable through the
 * key-based `t()`, so the whole dictionary is read via `useTranslations` for
 * those two branches while `useT` drives every scalar string.
 *
 * Hydration safety mirrors `SiteHeader`/`HomePage`: the build-time SSR HTML is
 * always the DEFAULT locale, while the store may already hold another locale on
 * the first client render. Rendering the default locale until `mounted` flips
 * keeps the hydration render byte-identical to the server and eliminates the
 * mismatch; the store locale is adopted immediately after mount.
 */

import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import Card from "@/components/Card";
import InstagramEmbed from "@/components/InstagramEmbed";
import Cluster from "@/components/layout/Cluster";
import Grid from "@/components/layout/Grid";
import Section from "@/components/layout/Section";
import Stack from "@/components/layout/Stack";
import Heading from "@/components/ui/Heading";
import Text from "@/components/ui/Text";
import { useLocale } from "@/hooks/useLocale";
import { useT, type Translate } from "@/hooks/useT";
import {
  contactIdentity,
  defaultLang,
  t as translate,
  useTranslations,
} from "@/i18n";
import type { InstagramEmbedData } from "@/lib/io/instagram";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

const HOME_HREF = "/";
const IG_HANDLE = `@${contactIdentity.acgIg}`;
const IG_HREF = `https://instagram.com/${contactIdentity.acgIg}`;

interface AcgPageProps {
  /** Build-time-resolved embeds, in photo-wall order. */
  embeds: InstagramEmbedData[];
}

export default function AcgPage({ embeds }: AcgPageProps) {
  const t = useT(clientDeps);
  const { locale } = useLocale(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;
  // The dictionary (not `t`) is needed only for the array-valued branches.
  const dict = useTranslations(mounted ? locale : defaultLang);

  const approach = dict.acgPage.approach;
  const commissionPoints = dict.acgPage.commissionPoints;
  const hasPhotos = embeds.length > 0;

  return (
    <div className="acg">
      <nav className="acg-rail" aria-label={tr("acgPage.back")}>
        <a className="acg-back" href={HOME_HREF}>
          <span className="acg-back__arrow" aria-hidden="true">
            ←
          </span>
          <span>{tr("acgPage.back")}</span>
        </a>
      </nav>

      <header className="acg-masthead">
        <p className="acg-masthead__status">
          <span className="acg-masthead__dot" aria-hidden="true" />
          <span className="acg-masthead__handle">{IG_HANDLE}</span>
          <span className="acg-masthead__sep" aria-hidden="true">
            ·
          </span>
          <span>{tr("acg.heading")}</span>
        </p>

        <Heading level={1} size="hero" className="acg-masthead__title">
          {tr("acgPage.introHeading")}
        </Heading>

        <Stack gap={4} className="acg-masthead__intro">
          <Text size="xl" tone="muted" measure>
            {tr("acgPage.introLead")}
          </Text>
          <Text measure>{tr("acgPage.introBody")}</Text>
        </Stack>
      </header>

      <Section
        id="work"
        className="reveal"
        heading={tr("acgPage.followHeading")}
        lead={tr("acgPage.followNote")}
      >
        <Stack gap={6}>
          {hasPhotos ? (
            <Grid min="19rem" gap={6} className="acg-wall">
              {embeds.map((embed) => (
                <InstagramEmbed
                  key={embed.url}
                  url={embed.url}
                  html={embed.html}
                  failed={embed.failed}
                />
              ))}
            </Grid>
          ) : (
            <a
              className="acg-empty"
              href={IG_HREF}
              target="_blank"
              rel="noopener"
            >
              <span className="acg-empty__label">
                {tr("acgPage.followCta")}
              </span>
              <span className="acg-empty__handle">{IG_HANDLE}</span>
              <span className="acg-empty__arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          )}

          <Cluster gap={4}>
            <a
              className="acg-cta"
              href={IG_HREF}
              target="_blank"
              rel="noopener"
            >
              <span>{tr("acgPage.followCta")}</span>
              <span className="acg-cta__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </Cluster>
        </Stack>
      </Section>

      <Section
        id="approach"
        className="reveal"
        heading={tr("acgPage.approachHeading")}
      >
        <Grid min="16rem" gap={6} className="acg-approach">
          {approach.map((item, index) => (
            <div key={`${item.title}-${index}`} className="acg-approach__item">
              <h3 className="acg-approach__title">{item.title}</h3>
              <Text tone="muted">{item.body}</Text>
            </div>
          ))}
        </Grid>
      </Section>

      <Section
        id="commission"
        className="reveal"
        heading={tr("acgPage.commissionHeading")}
      >
        <Card className="acg-commission">
          <Stack gap={5}>
            <Text tone="muted">{tr("acgPage.commissionLead")}</Text>
            <ul className="acg-commission__list">
              {commissionPoints.map((point, index) => (
                <li key={`${point}-${index}`} className="acg-commission__item">
                  {point}
                </li>
              ))}
            </ul>
            <Cluster gap={4}>
              <a
                className="acg-cta"
                href={IG_HREF}
                target="_blank"
                rel="noopener"
              >
                <span>{tr("acgPage.followCta")}</span>
                <span className="acg-cta__arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </Cluster>
          </Stack>
        </Card>
      </Section>
    </div>
  );
}
