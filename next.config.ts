import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.discogs.com" },
      { protocol: "https", hostname: "i.discogs.com" },
      { protocol: "https", hostname: "coverartarchive.org" },
    ],
  },
};

export default nextConfig;
