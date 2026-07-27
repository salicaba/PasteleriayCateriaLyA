// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appType = process.env.VITE_APP_TYPE || 'admin'; 

const pwaName = appType === 'client' ? 'Menú Lya' : 'Sistema Lya';
const pwaShortName = appType === 'client' ? 'Menú Lya' : 'POS Lya';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // 🔥 CAMBIO CLAVE: Cambiamos 'autoUpdate' por 'prompt' para controlar el botón
      includeAssets: ['favicon.png', 'logo.jpeg'],
      manifest: {
        name: pwaName,           
        short_name: pwaShortName, 
        description: 'Ecosistema Inteligente LyA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', 
        orientation: 'portrait',
        start_url: '/', 
        scope: '/',     
        icons: [
          { src: '/logo.jpeg', sizes: '192x192', type: 'image/jpeg', purpose: 'any maskable' },
          { src: '/logo.jpeg', sizes: '512x512', type: 'image/jpeg', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5242880 
      }
    })
  ],
});