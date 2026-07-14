import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.grindproof.co/",
      priority: 1,
    },
    {
      url: "https://www.grindproof.co/how-it-works",
      priority: 0.5,
    },
    {
      url: "https://www.grindproof.co/privacy",
      priority: 0.5,
    },
    {
      url: "https://www.grindproof.co/terms",
      priority: 0.5,
    },
  ];
}
