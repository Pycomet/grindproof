import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Work around Next.js 16 /_global-error prerender crash
    // The GlobalLayoutRouterContext is null during the error boundary prerender pass
    // This flag skips the static prerender of global-error
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
