import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ClientApp from './modules/client/ClientApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Vistas de Cliente (Menú Digital por QR) */}
        <Route path="/m/:tableId" element={<ClientApp type="mesa" />} />
        <Route path="/llevar" element={<ClientApp type="llevar" />} />
        
        {/* Sistema POS Administrativo (Fallback y Raíz) */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)