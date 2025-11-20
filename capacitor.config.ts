import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grindproof.app',
  appName: 'Grindproof',
  webDir: 'public',
  server: {
    url: "https://grindproof.co"
  }
};

export default config;
