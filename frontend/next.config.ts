// frontend/next.config.ts
import type { NextConfig } from "next";

/**
 * Dev-only config
 * ───────────────────────────────────────────────────────────────
 * • Runs only under `npm run dev` (Next.js dev server)
 * • Proxies every /api/* call to the Django dev server on :8000
 * • NEW: Allows <Image src="http://127.0.0.1:8000/media/..."> in dev
 * ───────────────────────────────────────────────────────────────
 */
const nextConfig: NextConfig = {
  target: "server",          // explicit (default in modern Next.js)
  trailingSlash: true,

  /* ────────────────  NEW  ──────────────── */
  images: {
    // Either style works; remotePatterns gives fine-grained control.
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",     // everything under /media/
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },

  async rewrites() {
    return [
      /* ── Preferred pattern: everything under /api/ ─────────────── */
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },

      /* ── Legacy bare endpoints (proxy to their /api/ equivalents) ─ */
      { source: "/token/",   destination: "http://127.0.0.1:8000/api/token/" },
      { source: "/token",    destination: "http://127.0.0.1:8000/api/token/" },

      { source: "/me/",      destination: "http://127.0.0.1:8000/api/me/" },
      { source: "/me",       destination: "http://127.0.0.1:8000/api/me/" },

      { source: "/history/", destination: "http://127.0.0.1:8000/api/history/" },
      { source: "/history",  destination: "http://127.0.0.1:8000/api/history/" },

      { source: "/refresh/", destination: "http://127.0.0.1:8000/api/refresh/" },
      { source: "/refresh",  destination: "http://127.0.0.1:8000/api/refresh/" },

      { source: "/logout/",  destination: "http://127.0.0.1:8000/api/logout/" },
      { source: "/logout",   destination: "http://127.0.0.1:8000/api/logout/" },
    ];
  },
};

export default nextConfig;
