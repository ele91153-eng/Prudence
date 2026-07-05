import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prudence.app',
  appName: 'Prudence',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
