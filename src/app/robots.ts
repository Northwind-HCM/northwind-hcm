import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/employee/",
          "/login",
          "/client/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://northwind-hr.eu/sitemap.xml",
  };
}