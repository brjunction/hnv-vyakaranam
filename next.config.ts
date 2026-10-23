import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep xlsx as a real Node dependency (not bundled by webpack).
  serverExternalPackages: ["xlsx"],
  // Spreadsheet uploads in the admin (Vercel caps request bodies at ~4.5 MB).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },

  // The old "Anvyaya" section is now /scriptures: every old address
  // (/anvyaya/SB/1/12/1, /Anvyaya/…, /ANVYAYA/…) redirects permanently; the
  // scripture page then lowercases the book code (/scriptures/sb/1/12/1).
  // Path matching is case-insensitive, so one rule covers every spelling.
  // /hnv-wiki is a normal page (app/hnv-wiki) built from public/hnv-wiki.html.
  // Other spellings of the wiki address → the wiki page (inside the site layout).
  async redirects() {
    return [
      { source: "/hnvwiki", destination: "/hnv-wiki", permanent: true },
      { source: "/wiki", destination: "/hnv-wiki", permanent: true },
      { source: "/scriptures/mine", destination: "/notes", permanent: true },
      { source: "/anvyaya", destination: "/scriptures", permanent: true },
      { source: "/anvyaya/:path*", destination: "/scriptures/:path*", permanent: true },
      { source: "/api/anvyaya/:path*", destination: "/scriptures", permanent: true },
    ];
  },

  async rewrites() {
    return [
      // Path matching is case-insensitive, so this also matches /hnv-wiki
      // itself — harmless for a rewrite (a redirect here would loop).
      { source: "/HNV-Wiki", destination: "/hnv-wiki" },
    ];
  },
};

export default nextConfig;
