declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    sw?: string;
    scope?: string;
    /**
     * Paths (relative to the served output, e.g. "/sw-custom.js") that get
     * wrapped in `importScripts(...)` calls inside the generated service
     * worker. This is how custom push/notificationclick handlers actually
     * become part of the registered service worker.
     */
    importScripts?: string[];
    runtimeCaching?: Array<{
      urlPattern: RegExp | string;
      handler: string;
      method?: string;
      options?: {
        cacheName?: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
          purgeOnQuotaError?: boolean;
        };
        networkTimeoutSeconds?: number;
        rangeRequests?: boolean;
        cacheableResponse?: {
          statuses?: number[];
          headers?: Record<string, string>;
        };
        backgroundSync?: {
          name: string;
          options?: {
            maxRetentionTime?: number;
          };
        };
        broadcastUpdate?: {
          channelName: string;
        };
        matchOptions?: {
          ignoreSearch?: boolean;
          ignoreMethod?: boolean;
          ignoreVary?: boolean;
        };
      };
    }>;
    publicExcludes?: string[];
    buildExcludes?: (string | RegExp)[];
    fallbacks?: {
      image?: string;
      audio?: string;
      video?: string;
      document?: string;
      font?: string;
    };
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;

  export default withPWA;
}
