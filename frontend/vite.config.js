import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', 
      includeAssets: ['favicon.png', 'logo.jpeg'],
      manifest: {
        name: 'Pastelería y Cafetería Lya',
        short_name: 'Menú Lya',
        description: 'Menú digital inteligente y sistema de pedidos de LyA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', 
        orientation: 'portrait',
        icons: [
          {
            src: 'logo.jpeg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: 'logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg}'],
        // 🔥 SOLUCIÓN: Elevamos el límite de caché a 5 MB (5242880 bytes)
        maximumFileSizeToCacheInBytes: 5242880 
      }
    })
  ],
});