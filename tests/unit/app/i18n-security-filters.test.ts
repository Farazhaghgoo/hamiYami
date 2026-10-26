import { describe, expect, it } from "vitest";
import { menuWindow } from "@/domain/menu-window";
import { filtersToSearchParams, parseDiscoveryFilters } from "@/features/meals/discovery";
import { switchLocalePath } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { it as itDictionary } from "@/i18n/dictionaries/it";
import { plural } from "@/i18n/format";
import { buildContentSecurityPolicy } from "@/server/security/csp";

function leaves(value: unknown, path = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof value === "string") out.set(path, value);
  else if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${path}[${i}]`).forEach((s, p) => out.set(p, s)));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) leaves(v, path ? `${path}.${k}` : k).forEach((s, p) => out.set(p, s));
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  const itLeaves = leaves(itDictionary);
  const enLeaves = leaves(en);

  it("cover the same keys and list lengths in Italian and English", () => {
    expect([...enLeaves.keys()].sort()).toEqual([...itLeaves.keys()].sort());
  });

  it("use the same placeholders in both languages and are never empty", () => {
    for (const [path, itText] of itLeaves) {
      const enText = enLeaves.get(path) ?? "";
      expect(placeholders(enText), path).toEqual(placeholders(itText));
      // Empty notes are allowed only where a card has no note.
      if (!path.endsWith(".note")) {
        expect(itText.trim(), path).not.toBe("");
        expect(enText.trim(), path).not.toBe("");
      }
    }
  });

  it("never claim verified cooks, real orders or guaranteed safety", () => {
    const banned = [/100% (safe|sicur)/i, /guaranteed hygiene/i, /certified by hamiyami/i, /every meal inspected/i, /verified cook/i, /cuochi verificati/i];
    for (const text of [...itLeaves.values(), ...enLeaves.values()]) {
      for (const pattern of banned) expect(text).not.toMatch(pattern);
    }
  });

  it("pluralises per locale", () => {
    expect(plural(itDictionary.common.portions, 1, "it")).toBe("1 porzione");
    expect(plural(itDictionary.common.portions, 3, "it")).toBe("3 porzioni");
    expect(plural(en.common.portions, 1, "en")).toBe("1 portion");
  });

  it("switches the locale prefix of a path", () => {
    expect(switchLocalePath("/it/meals/off-1", "en")).toBe("/en/meals/off-1");
    expect(switchLocalePath("/en", "it")).toBe("/it");
  });
});

describe("content security policy", () => {
  it("allows only same-origin resources and nonce-tagged scripts in production", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc", isDev: false, upgradeInsecure: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("style-src 'self' 'nonce-abc'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("relaxes only what development tooling needs", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc", isDev: true, upgradeInsecure: false });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("discovery filters in the URL", () => {
  const menu = menuWindow("2026-10-25");

  it("round-trips valid filters", () => {
    const filters = {
      neighborhood: "nb-rione-melograno",
      date: "2026-10-27",
      diet: ["vegan" as const],
      maxPriceCents: 750,
      sort: "price_desc" as const,
    };
    expect(parseDiscoveryFilters(filtersToSearchParams(filters), menu)).toEqual(filters);
  });

  it("ignores malformed or out-of-window values instead of trusting them", () => {
    const params = new URLSearchParams("area=<script>&date=2020-01-01&diet=vegan,gluten-free&maxPrice=12.5&sort=random");
    expect(parseDiscoveryFilters(params, menu)).toEqual({
      neighborhood: null,
      date: null,
      diet: ["vegan"],
      maxPriceCents: null,
      sort: "time",
    });
    expect(parseDiscoveryFilters(new URLSearchParams("maxPrice=99999999"), menu).maxPriceCents).toBeNull();
  });
});
