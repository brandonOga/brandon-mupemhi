import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    // Serve the CV uploaded from /admin at /cv.pdf on this domain. Must match
    // CV_BUCKET / CV_PATH in lib/cv.ts. A public/cv.pdf file, if present, wins.
    if (!supabaseUrl) return [];
    return [
      {
        source: "/cv.pdf",
        destination: `${supabaseUrl}/storage/v1/object/public/site-files/cv.pdf`,
      },
    ];
  },
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
