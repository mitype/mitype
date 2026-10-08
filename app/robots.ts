import type { MetadataRoute } from "next";

const BASE_URL = "https://mitypeapp.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // AI training and scraping crawlers: no access to anything.
        userAgent: [
          "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web",
          "anthropic-ai", "Claude-User", "Claude-SearchBot", "CCBot",
          "Google-Extended", "GoogleOther", "PerplexityBot", "Perplexity-User",
          "Bytespider", "Amazonbot", "Applebot-Extended", "cohere-ai",
          "Diffbot", "FacebookBot", "meta-externalagent", "meta-externalfetcher",
          "ImagesiftBot", "Omgilibot", "Timpibot", "YouBot", "Ai2Bot",
          "DuckAssistBot", "MistralAI-User", "PetalBot", "img2dataset",
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
