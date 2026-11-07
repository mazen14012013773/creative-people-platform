import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  appType: 'spa',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/mabdeen-icon.jpg', 'images/mabdeen-icon.png', 'images/mabdeen-logo.jpg'],
      manifest: {
        name: 'مبدعين | Mabdeen',
        short_name: 'مبدعين',
        description: 'منصة عربية تجمع المبدعين والعملاء لعرض الأعمال والخدمات وبدء محادثات داخلية آمنة.',
        theme_color: '#071c43',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/images/mabdeen-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\/uploads\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'local-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom)(?:[\\/]|$)/,
            },
            {
              name: 'ui',
              test: /node_modules[\\/](?:lucide-react|dompurify)(?:[\\/]|$)/,
            },
            {
              name: 'query',
              test: /node_modules[\\/](?:@tanstack[\\/]react-query|axios)(?:[\\/]|$)/,
            },
          ],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    // The parent-verification page must be reachable from a phone over HTTPS during local development.
    // Quick Cloudflare Tunnel hostnames are temporary and random, so allow only their domain suffix.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
});
