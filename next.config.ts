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
      // Images upload client-side straight to Supabase Storage now; this
      // action body only carries form text + a rich-text body field.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
