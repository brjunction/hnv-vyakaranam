import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep xlsx as a real Node dependency (not bundled by webpack) so its
  // file-system based XLSX.readFile() works correctly on the server.
  serverExternalPackages: ["xlsx"],

  // Make sure the Excel files under content/ are shipped with the deployed
  // server functions (Vercel only includes files it can see being used).
  outputFileTracingIncludes: {
    "/": ["./content/**/*"],
    "/**/*": ["./content/**/*"],
  },

  // /Anvyaya/SB/1/12/1 (capital A) keeps working — it is served by the same
  // pages as /anvyaya/SB/1/12/1, without changing the address in the browser.
  // /hnv-wiki serves the static file public/hnv-wiki.html directly (it's a
  // full self-contained HTML document, so it bypasses Next's own layout).
  async rewrites() {
    return [
      { source: "/Anvyaya", destination: "/anvyaya" },
      { source: "/Anvyaya/:path*", destination: "/anvyaya/:path*" },
      { source: "/ANVYAYA", destination: "/anvyaya" },
      { source: "/ANVYAYA/:path*", destination: "/anvyaya/:path*" },
      { source: "/hnv-wiki", destination: "/hnv-wiki.html" },
      { source: "/HNV-Wiki", destination: "/hnv-wiki.html" },
      { source: "/hnvwiki", destination: "/hnv-wiki.html" },
      { source: "/wiki", destination: "/hnv-wiki.html" },
    ];
  },
};

export default nextConfig;
