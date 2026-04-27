import type { MetadataRoute } from "next";

const BASE_URL = "https://mitypeapp.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/messages",
          "/edit-profile",
          "/create-profile",
          "/update-password",
          "/reset-password",
          "/subscription",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
