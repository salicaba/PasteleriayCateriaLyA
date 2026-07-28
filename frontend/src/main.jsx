import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ClientApp from './modules/client/ClientApp.jsx'

// 🔥 1. IMPORTAMOS EL MOTOR DE REGISTRO DEL SERVICE WORKER
import { registerSW } from 'virtual:pwa-register'

// 🔥 2. FORZAMOS EL REGISTRO INMEDIATO PARA ACTIVAR LA PWA
registerSW({ immediate: true })

// 🔥 3. EL CEREBRO MAESTRO: Leemos en qué Vercel estamos (admin o client)
const APP_TYPE = import.meta.env.VITE_APP_TYPE || 'admin';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* 🔥 SEPARACIÓN SEGURA: Usamos ternario ( ? : ) para no romper React Router v6 */}
      {APP_TYPE === 'client' ? (
        <Routes>
          <Route path="/" element={<ClientApp type="kiosko" />} />
          <Route path="/m/:tableId" element={<ClientApp type="mesa" />} />
          <Route path="/llevar" element={<ClientApp type="llevar" />} />
          <Route path="/*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/m/:tableId" element={<ClientApp type="mesa" />} />
          <Route path="/llevar" element={<ClientApp type="llevar" />} />
          <Route path="/kiosko" element={<ClientApp type="kiosko" />} />
          <Route path="/*" element={<App />} />
        </Routes>
      )}
    </BrowserRouter>
  </StrictMode>,
)