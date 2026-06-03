// src/app.js
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js'; 
import menuRoutes from './modules/menu/menu.routes.js';
import posRoutes from './modules/pos/pos.routes.js';
import kitchenRoutes from './modules/kitchen/kitchen.routes.js';
import pasteleriaRoutes from './modules/pasteleria/pasteleria.routes.js'; 
import settingsRoutes from './modules/settings/settings.routes.js';
import cashRoutes from './modules/cash/cash.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js'; 
import reportsRoutes from './modules/reports/reports.routes.js'; 

const app = express();

// --- NUEVA CONFIGURACIÓN CORS PARA PRODUCCIÓN ---
const allowedOrigins = [
  process.env.FRONTEND_URL, // Tu futura URL de Vercel
  'http://localhost:5173',  // Entorno local Vite
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (ej. peticiones de servidor a servidor o Postman local)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por la política de CORS'));
    }
  },
  credentials: true, // Crucial para permitir envío de tokens, cookies y uso de WebSockets cruzados
}));
// ------------------------------------------------

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas Base
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/menu', menuRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/pasteleria', pasteleriaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/inventory', inventoryRoutes); 
app.use('/api/reports', reportsRoutes); 

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema 𝓛𝔂𝓐 operando correctamente' });
});

export default app;