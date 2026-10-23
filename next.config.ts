import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep xlsx as a real Node dependency (not bundled by webpack) so its
  // file-system based XLSX.readFile() works correctly on the server.
  serverExternalPackages: ["xlsx"],
  // Spreadsheet uploads in the admin (Vercel caps request bodies at ~4.5 MB).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },

  // Make sure the Excel files under content/ are shipped with the deployed
  // server functions (Vercel only includes files it can see being used).
  outputFileTracingIncludes: {
    "/": ["./content/**/*"],
    "/**/*": ["./content/**/*"],
  },

  // /Anvyaya/SB/1/12/1 (capital A) keeps working — it is served by the same
  // pages as /anvyaya/SB/1/12/1, without changing the address in the browser.
  // /hnv-wiki is a normal page (app/hnv-wiki) built from public/hnv-wiki.html.
  // Other spellings of the wiki address → the wiki page (inside the site layout).
  async redirects() {
    return [
      { source: "/hnvwiki", destination: "/hnv-wiki", permanent: true },
      { source: "/wiki", destination: "/hnv-wiki", permanent: true },
    ];
  },

  async rewrites() {
    return [
      // Path matching is case-insensitive, so this also matches /hnv-wiki
      // itself — harmless for a rewrite (a redirect here would loop).
      { source: "/HNV-Wiki", destination: "/hnv-wiki" },
      { source: "/Anvyaya", destination: "/anvyaya" },
      { source: "/Anvyaya/:path*", destination: "/anvyaya/:path*" },
      { source: "/ANVYAYA", destination: "/anvyaya" },
      { source: "/ANVYAYA/:path*", destination: "/anvyaya/:path*" },
    ];
  },
};

export default nextConfig;
