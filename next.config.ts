import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep xlsx as a real Node dependency (not bundled by webpack) so its
  // file-system based XLSX.readFile() works correctly on the server.
  serverExternalPackages: ["xlsx"],
};

export default nextConfig;
