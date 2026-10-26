import type { MetadataRoute } from "next";
import { siteUrl } from "@/shared/seo/metadata";

/** Search engines, AI answer engines (which cite pages with a link) and AI training crawlers. */
const AI_SEARCH_AGENTS = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User"];
const AI_TRAINING_AGENTS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent"];

export default function robots(): MetadataRoute.Robots {
  const rule = { allow: "/", disallow: "/api/" };
  return {
    rules: [
      { userAgent: "*", ...rule },
      { userAgent: AI_SEARCH_AGENTS, ...rule },
      { userAgent: AI_TRAINING_AGENTS, ...rule },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
