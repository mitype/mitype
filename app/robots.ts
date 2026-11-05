import type { MetadataRoute } from "next";

const BASE_URL = "https://www.mitypeapp.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // AI TRAINING and bulk-scraping crawlers: no access to anything.
        // AI SEARCH / answer-engine bots (OAI-SearchBot, ChatGPT-User,
        // PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User,
        // DuckAssistBot, Bingbot, Applebot) are intentionally NOT listed
        // here so Mitype can be cited in AI answers and search results.
        userAgent: [
          "GPTBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "CCBot",
          "Google-Extended", "GoogleOther", "Bytespider", "Amazonbot",
          "Applebot-Extended", "cohere-ai", "Diffbot", "FacebookBot",
          "meta-externalagent", "meta-externalfetcher", "ImagesiftBot",
          "Omgilibot", "Timpibot", "YouBot", "Ai2Bot", "MistralAI-User",
          "PetalBot", "img2dataset",
        ],
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/messages",
          "/edit-profile",
          "/edit-business-profile",
          "/create-profile",
          "/update-password",
          "/reset-password",
          "/subscription",
          // Auth-walled feeds: crawlers can't see content here, no
          // value in indexing. Public dynamic routes (/profile, /business,
          // /home-goods/[id]) are still allowed and surface via sitemap.
          "/wave",
          "/wave/create",
          "/home-goods/new",
          "/home-goods/mine",
          "/discover",
          "/spotlight",
          "/weekly",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
