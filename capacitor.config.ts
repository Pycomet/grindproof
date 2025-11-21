import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grindproof.app',
  appName: 'Grindproof',
  webDir: 'out',
  server: {
    url: process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : 'https://grindproof.co',
    cleartext: true, // Allow http in development
  },
  ios: {
    contentInset: 'automatic',
    // Handle OAuth redirects in WKWebView
    scheme: 'Grindproof',
  },
  android: {
    // Allow cleartext traffic for development
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#09090b',
    },
  },
};

export default config;
