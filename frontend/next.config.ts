import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,                 // ← ADD THIS LINE
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*", // keep as-is
      },
    ];
  },
};

export default nextConfig;
