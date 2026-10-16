import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'FocusFeed - YouTube Interest Controller',
    description: 'Granular interest-based YouTube feed controller with daily out-of-interest viewing credits.',
    version: '1.0.0',
    permissions: ['storage', 'alarms'],
    host_permissions: ['*://*.youtube.com/*'],
    action: {
      default_title: 'FocusFeed'
    }
  },
  vite: () => ({
    plugins: [
      tailwindcss() as any
    ]
  })
});
