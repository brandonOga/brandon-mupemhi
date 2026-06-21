import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        // Supabase Storage public URLs (project-images bucket)
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
  experimental: {
    serverActions: {
      // Project image uploads go through a Server Action; the default cap is
      // 1 MB, which rejects normal photos. Allow room for a cover + gallery.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
