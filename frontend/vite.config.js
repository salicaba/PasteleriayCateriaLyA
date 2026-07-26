import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vercel inyectará esta variable. Si no existe (como en tu local), será 'admin' por defecto.
const appType = process.env.VITE_APP_TYPE || 'admin'; 

const pwaName = appType === 'client' ? 'Menú LyA' : 'Sistema LyA';
const pwaShortName = appType === 'client' ? 'Menú LyA' : 'POS LyA';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', 
      includeAssets: ['favicon.png', 'logo.jpeg'],
      manifest: {
        name: pwaName,           // 🔥 Nombre dinámico
        short_name: pwaShortName, // 🔥 Nombre corto dinámico
        description: 'Ecosistema Inteligente LyA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', 
        orientation: 'portrait',
        icons: [
          {
            src: '/logo.jpeg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: '/logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5242880 
      }
    })
  ],
});