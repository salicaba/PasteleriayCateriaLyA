import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Poka-Yoke: Actualización silenciosa sin romper la sesión
      includeAssets: ['favicon.png', 'logo.jpeg'],
      manifest: {
        name: 'Pastelería y Cafetería Lya',
        short_name: 'Menú Lya',
        description: 'Menú digital inteligente y sistema de pedidos de LyA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Obliga a ocultar la UI del navegador
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
        // Blindaje de cache para assets estáticos
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg}']
      }
    })
  ],
});