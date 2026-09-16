import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cbe.wholesaleactiontracker',
  appName: 'CBE Action Tracker',
  webDir: 'dist',
  server: {
    // Allows loading remote or local dev server over HTTP during development
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#0f172a',
  },
};

export default config;
