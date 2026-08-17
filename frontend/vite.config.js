// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // 🔥 Añadimos tu nuevo ícono a la caché
      includeAssets: ['favicon.png', 'logo.jpeg', 'logo-pos.jpeg'], 
      
      // 🔥 APAGAMOS EL MANIFIESTO ESTÁTICO (Nosotros lo crearemos dinámicamente)
      manifest: false, 
      
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5242880 
      }
    })
  ],
});