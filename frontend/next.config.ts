// next.config.ts
import type { NextConfig } from "next";

/**
 * Dev-only config
 * ───────────────────────────────────────────────────────────────
 * • Runs only under `npm run dev` (Next.js dev server)
 * • Lets us expose ONE ngrok origin (port 3000) that speaks to
 *   our local Django dev server on port 8000.
 *
 * How it works:
 *   ┌───────── browser fetches ─────────┐
 *   │ https://<tunnel>.ngrok-free.app   │  ← protected by Basic-Auth once
 *   │     /api/...   or   /token/       │
 *   └─────────────┬─────────────────────┘
 *                 │  Next.js dev server rewrites (below)
 *                 ▼
 *   http://127.0.0.1:8000/api/...       │  ← Django backend
 * ───────────────────────────────────────────────────────────────
 */
const nextConfig: NextConfig = {
  target: "server",        // explicit (default in modern Next.js)
  trailingSlash: true,

  async rewrites() {
    return [
      /* ── Preferred pattern: everything under /api/ ────────────────────── */
      {
        source: "/api/:path*",                       // e.g. /api/users/5/
        destination: "http://127.0.0.1:8000/api/:path*",
      },

      /* ── Legacy bare endpoints (proxy to their /api/ equivalents) ─────── */
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
