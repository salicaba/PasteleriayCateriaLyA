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
// import.meta.env es la forma en que Vite lee las variables de Vercel en React
const APP_TYPE = import.meta.env.VITE_APP_TYPE || 'admin';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        
        {/* ========================================================== */}
        {/* 🟢 BIFURCACIÓN A: PROYECTO CLIENTES (Menú LyA)             */}
        {/* ========================================================== */}
        {APP_TYPE === 'client' && (
          <>
            {/* Si entran a la raíz, los manda directo al Kiosko de Mesas */}
            <Route path="/" element={<ClientApp type="kiosko" />} />
            
            {/* Mantienen sus rutas por QR */}
            <Route path="/m/:tableId" element={<ClientApp type="mesa" />} />
            <Route path="/llevar" element={<ClientApp type="llevar" />} />
            
            {/* Si intentan entrar a cualquier otra cosa, los regresa al inicio */}
            <Route path="/*" element={<Navigate to="/" replace />} />
          </>
        )}

        {/* ========================================================== */}
        {/* 🔵 BIFURCACIÓN B: PROYECTO EMPLEADOS (Sistema LyA)         */}
        {/* ========================================================== */}
        {APP_TYPE === 'admin' && (
          <>
            {/* Mantenemos las rutas QR por si un mesero escanea el QR con su propio cel */}
            <Route path="/m/:tableId" element={<ClientApp type="mesa" />} />
            <Route path="/llevar" element={<ClientApp type="llevar" />} />
            <Route path="/kiosko" element={<ClientApp type="kiosko" />} />
            
            {/* La raíz aquí SÍ es el Sistema POS de Empleados */}
            <Route path="/*" element={<App />} />
          </>
        )}

      </Routes>
    </BrowserRouter>
  </StrictMode>,
)