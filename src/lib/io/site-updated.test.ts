import { describe, expect, it } from "vitest";

import rawSiteUpdated from "../../data/site-updated.json";
import { parseSiteUpdated, siteUpdated } from "./site-updated";

describe("site-updated.json schema", () => {
  it("accepts the shipped stamp and keeps it verbatim as iso", () => {
    const parsed = parseSiteUpdated(rawSiteUpdated);

    expect(parsed.iso).toBe(rawSiteUpdated.updatedAt);
    expect(parsed.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("derives the display string without a Date or timezone shift", () => {
    expect(parseSiteUpdated({ updatedAt: "2026-10-31T14:05" }).display).toBe(
      "2026-10-31 14:05",
    );
  });

  it("exposes the same pair through the module-level siteUpdated", () => {
    expect(siteUpdated).toEqual(parseSiteUpdated(rawSiteUpdated));
    expect(siteUpdated.display).toBe(
      `${siteUpdated.iso.slice(0, 10)} ${siteUpdated.iso.slice(11)}`,
    );
  });

  it("throws naming the bad value when the shape is wrong", () => {
    expect(() => parseSiteUpdated({ updatedAt: "2026-10-31 14:05" })).toThrow(
      "2026-10-31 14:05",
    );
  });

  it("throws naming the bad value when a field is out of range", () => {
    expect(() => parseSiteUpdated({ updatedAt: "2026-13-99T99:99" })).toThrow(
      "2026-13-99T99:99",
    );
  });

  it("throws naming a missing value", () => {
    expect(() => parseSiteUpdated({})).toThrow("updatedAt");
  });

  it("throws on a non-object root", () => {
    expect(() => parseSiteUpdated("2026-10-31T14:05")).toThrow("updatedAt");
  });
});
