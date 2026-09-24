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
      // Images upload client-side straight to Supabase Storage. The extra
      // allowance covers CSV project imports plus multipart form overhead.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
