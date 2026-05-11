import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d667c8abe4014de4a2d0f76a00fee1c8',
  appName: 'Growth Game',
  webDir: 'dist',
  server: {
    url: 'https://d667c8ab-e401-4de4-a2d0-f76a00fee1c8.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    backgroundColor: '#0f0f12',
  },
  ios: {
    backgroundColor: '#0f0f12',
    contentInset: 'always',
  },
};

export default config;
