import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.profikarriere.app',
  appName: 'Legendenweg',
  webDir: 'dist',
  backgroundColor: '#0e1a24',
  android: { allowMixedContent: false },
};

export default config;
