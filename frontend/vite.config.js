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
        name: 'Ecosistema Lya', // 🔥 Nombre completo (se ve al instalar)
        short_name: 'App Lya',  // 🔥 Nombre corto (se ve debajo del ícono en el celular)
        description: 'Punto de Venta y Menú Digital Inteligente',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', 
        orientation: 'portrait',
        icons: [
          {
            src: '/logo.jpeg', // 🔥 Asegúrate de que tenga el '/' al inicio
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: '/logo.jpeg', // 🔥 Asegúrate de que tenga el '/' al inicio
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