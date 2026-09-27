import type { MetadataRoute } from "next";
import { chapters } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://harinamamrta.org";
  const staticRoutes = ["", "/about", "/more", "/chapters"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
  }));
  const chapterRoutes = chapters.map((c) => ({
    url: `${base}/chapters/${c.slug}`,
    lastModified: new Date(),
  }));
  return [...staticRoutes, ...chapterRoutes];
}
