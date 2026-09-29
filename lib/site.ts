// The ONE place that holds your website address. Used by the sitemap,
// robots.txt and the page metadata. Change it in site.config.json (at the
// repo root) if you ever get a custom domain — nowhere else. That same file
// is also read by scripts/generate-sitemap.mjs, which writes the real
// public/sitemap.xml at build time, so both stay in sync automatically.
import siteConfig from "@/site.config.json";

export const SITE_URL: string = siteConfig.siteUrl;
